import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Lang } from '../types';
import type { Chapter, ChapterMood } from './chapters/types';
import { createCoffeeChapter } from './chapters/coffee';
import { createShakshukaChapter } from './chapters/shakshuka';
import { createPlovChapter } from './chapters/plov';
import { createDessertChapter } from './chapters/dessert';
import { CameraPath } from './cameraPath';
import { buildDesktopKeyframes, buildMobileKeyframes } from './cameraKeyframes';
import { CHAPTERS, FINAL_COPY, FINAL_REVEAL_START, type ChapterMeta } from './dishes';
import { createNoiseBumpTexture } from './craft';
import './CinematicExperience.css';

gsap.registerPlugin(ScrollTrigger);

const MOBILE_BREAKPOINT = 820;

interface CinematicExperienceProps {
  lang: Lang;
  isDark: boolean;
  enabled?: boolean;
}

function smootherstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

function chapterWeight(progress: number, meta: ChapterMeta): number {
  const [start, end] = meta.range;
  const [coreStart, coreEnd] = meta.core;
  if (progress < start || progress > end) return 0;
  if (progress <= coreStart) return coreStart > start ? smootherstep((progress - start) / (coreStart - start)) : 1;
  if (progress >= coreEnd) return coreEnd < end ? 1 - smootherstep((progress - coreEnd) / (end - coreEnd)) : 1;
  return 1;
}

function accumulateColor(accum: THREE.Color, hex: number, weight: number) {
  if (weight <= 0) return;
  accum.r += ((hex >> 16) & 255) / 255 * weight;
  accum.g += ((hex >> 8) & 255) / 255 * weight;
  accum.b += (hex & 255) / 255 * weight;
}

/** The homepage's cinematic 3D journey — four dishes on one continuous
 * scroll-scrubbed camera path (see cameraKeyframes.ts / CameraPath). One
 * scene, one renderer, one pinned canvas: chapters never cross-fade, the
 * camera physically travels from one to the next along a shared table. */
export function CinematicExperience({ lang, isDark, enabled = true }: CinematicExperienceProps) {
  const wrapperRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<Chapter[] | null>(null);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const [isReady, setIsReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const widthQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => {
      setReducedMotion(motionQuery.matches);
      setIsMobile(widthQuery.matches);
    };
    update();
    motionQuery.addEventListener('change', update);
    widthQuery.addEventListener('change', update);
    return () => {
      motionQuery.removeEventListener('change', update);
      widthQuery.removeEventListener('change', update);
    };
  }, []);

  const chapterCopy = useMemo(
    () => CHAPTERS.map((meta) => ({ meta, copy: meta.copy[lang] })),
    [lang],
  );

  useEffect(() => {
    if (!enabled || reducedMotion) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!canvas || !wrapper || !stage) return;

    let mounted = true;
    let raf = 0;
    const quality: 'high' | 'low' = isMobile ? 'low' : 'high';
    const dprCap = isMobile ? 1.5 : 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, stage.clientWidth / stage.clientHeight, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.65;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
    scene.environment = envRenderTarget.texture;
    scene.background = new THREE.Color(0xfaf6f0);
    scene.fog = new THREE.Fog(0xfaf6f0, 6, 22);

    // ---- lights: one shared, travelling key/fill/rim rig blended from the
    // moods of whichever chapters currently have presence — see mood-blend
    // loop in tick() below. Grounding comes from each chapter's own contact-
    // shadow disc (see craft.ts) rather than a real-time shadow map — a
    // single light whose position jumps between chapters every frame is a
    // poor fit for a stable shadow camera, and the contact discs already
    // read correctly at this composition's scale.
    const ambient = new THREE.AmbientLight(0xfff4e8, 0.3);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff1e0, 1.4);
    scene.add(key);
    scene.add(key.target);
    const fill = new THREE.DirectionalLight(0xd7e4ff, 0.28);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd9ac, 0.6);
    scene.add(rim);

    // ---- the long table every dish sits on — one continuous surface makes
    // the "camera travels through a physical world" idea literal.
    const tableTexture = createNoiseBumpTexture(256, 40, 0.14, 6);
    const tableMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdccbb0,
      roughness: 0.62,
      clearcoat: 0.08,
      clearcoatRoughness: 0.5,
      bumpMap: tableTexture,
      bumpScale: 0.006,
    });
    const worldLength = CHAPTERS[CHAPTERS.length - 1].z - 8;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(6, Math.abs(worldLength) + 14), tableMaterial);
    table.rotation.x = -Math.PI / 2;
    table.position.set(0, -0.32, worldLength / 2 + 3);
    table.receiveShadow = true;
    scene.add(table);

    // ---- chapters --------------------------------------------------------
    const builders: Record<string, (q: 'high' | 'low') => Chapter> = {
      coffee: createCoffeeChapter,
      shakshuka: createShakshukaChapter,
      plov: createPlovChapter,
      dessert: createDessertChapter,
    };
    const chapters: Chapter[] = CHAPTERS.map((meta) => {
      const chapter = builders[meta.id](quality);
      chapter.group.position.set(0, 0, meta.z);
      chapter.applyTheme(isDarkRef.current);
      scene.add(chapter.group);
      return chapter;
    });
    chaptersRef.current = chapters;

    // ---- camera path -------------------------------------------------------
    const keyframes = isMobile ? buildMobileKeyframes() : buildDesktopKeyframes();
    const cameraPath = new CameraPath(keyframes);
    const camPos = new THREE.Vector3();
    const camLookAt = new THREE.Vector3();

    // ---- postprocessing (desktop only — a genuinely subtle bloom on
    // ceramic/glaze highlights and gold leaf, nothing game-like) -----------
    let composer: EffectComposer | null = null;
    if (quality === 'high') {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(stage.clientWidth, stage.clientHeight), 0.15, 0.4, 0.95);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    // ---- scroll-driven master timeline -------------------------------------
    const progressState = { value: 0 };
    const scrollTrigger = ScrollTrigger.create({
      trigger: wrapper,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.65,
      pin: stage,
      anticipatePin: 1,
      onUpdate: (self) => {
        progressState.value = self.progress;
        if (self.progress > 0.02 && scrollHintRef.current) {
          scrollHintRef.current.classList.add('is-hidden');
        }
      },
    });

    const weightAccum = new Map<string, number>();
    const blendedKey = new THREE.Color();
    const blendedFill = new THREE.Color();
    const blendedRim = new THREE.Color();
    const blendedAmbient = new THREE.Color();
    const blendedFog = new THREE.Color();
    const keyPos = new THREE.Vector3();
    const fillPos = new THREE.Vector3();
    const rimPos = new THREE.Vector3();
    const worldOffset = new THREE.Vector3();

    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const wasVisible = isVisible;
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible && !wasVisible && mounted) tick();
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(wrapper);

    const clock = new THREE.Clock();
    let firstFrame = true;

    const tick = () => {
      if (!mounted || !isVisible || document.hidden) return;
      const elapsed = clock.getElapsedTime();
      const progress = progressState.value;

      const fov = cameraPath.sample(progress, { position: camPos, lookAt: camLookAt });
      camera.position.copy(camPos);
      camera.lookAt(camLookAt);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      let sumWeight = 0;
      blendedKey.setScalar(0);
      blendedFill.setScalar(0);
      blendedRim.setScalar(0);
      blendedAmbient.setScalar(0);
      blendedFog.setScalar(0);
      keyPos.set(0, 0, 0);
      fillPos.set(0, 0, 0);
      rimPos.set(0, 0, 0);
      let keyIntensity = 0;
      let fillIntensity = 0;
      let rimIntensity = 0;
      let ambientIntensity = 0;

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const meta = CHAPTERS[i];
        const weight = chapterWeight(progress, meta);
        weightAccum.set(meta.id, weight);
        sumWeight += weight;

        const localProgress = Math.min(1, Math.max(0, (progress - meta.range[0]) / (meta.range[1] - meta.range[0])));
        chapter.update(localProgress, { elapsed, isDark: isDarkRef.current, presence: weight, quality });

        if (weight <= 0) continue;
        const mood: ChapterMood = chapter.getMood(isDarkRef.current);
        worldOffset.set(0, 0, meta.z);

        keyPos.addScaledVector(worldOffset.clone().add(mood.keyOffset), weight);
        fillPos.addScaledVector(worldOffset.clone().add(mood.fillOffset), weight);
        rimPos.addScaledVector(worldOffset.clone().add(mood.rimOffset), weight);
        accumulateColor(blendedKey, mood.keyColor, weight);
        accumulateColor(blendedFill, mood.fillColor, weight);
        accumulateColor(blendedRim, mood.rimColor, weight);
        accumulateColor(blendedAmbient, mood.ambientColor, weight);
        accumulateColor(blendedFog, mood.fogColor, weight);
        keyIntensity += mood.keyIntensity * weight;
        fillIntensity += mood.fillIntensity * weight;
        rimIntensity += mood.rimIntensity * weight;
        ambientIntensity += mood.ambientIntensity * weight;
      }

      const norm = sumWeight > 1e-4 ? 1 / sumWeight : 0;
      key.position.copy(keyPos).multiplyScalar(norm);
      key.color.copy(blendedKey).multiplyScalar(norm);
      key.intensity = keyIntensity * norm;
      key.target.position.copy(camLookAt);
      key.target.updateMatrixWorld();
      fill.position.copy(fillPos).multiplyScalar(norm);
      fill.color.copy(blendedFill).multiplyScalar(norm);
      fill.intensity = fillIntensity * norm;
      rim.position.copy(rimPos).multiplyScalar(norm);
      rim.color.copy(blendedRim).multiplyScalar(norm);
      rim.intensity = rimIntensity * norm;
      ambient.color.copy(blendedAmbient).multiplyScalar(norm);
      ambient.intensity = ambientIntensity * norm;

      const fogColor = blendedFog.multiplyScalar(norm);
      (scene.background as THREE.Color).copy(fogColor);
      if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(fogColor);

      // ---- typography: opacity/translate driven directly from the same
      // weights, mutated on refs (not React state) to stay smooth at 60fps.
      // Keyed off CHAPTERS (lang-invariant) rather than the memoized
      // chapterCopy, so this closure never needs `lang` and toggling the
      // language never has to tear down and rebuild the WebGL scene.
      // Text uses a steeper falloff than the light/fog blend (cubed) — two
      // headlines both at, say, 30% opacity read as an illegible overlap,
      // where the same 30% is a perfectly natural cross-blend for lighting.
      CHAPTERS.forEach((meta) => {
        const el = textRefs.current[meta.id];
        if (!el) return;
        const w = weightAccum.get(meta.id) ?? 0;
        const textOpacity = w * w * w;
        el.style.opacity = String(textOpacity);
        el.style.transform = `translateY(${(1 - w) * 22}px)`;
        el.style.pointerEvents = textOpacity > 0.6 ? 'auto' : 'none';
      });
      const finalEl = textRefs.current.final;
      if (finalEl) {
        const finalWeight = smootherstep((progress - FINAL_REVEAL_START) / (1 - FINAL_REVEAL_START));
        const finalTextOpacity = finalWeight * finalWeight * finalWeight;
        finalEl.style.opacity = String(finalTextOpacity);
        finalEl.style.transform = `translateY(${(1 - finalWeight) * 22}px)`;
        finalEl.style.pointerEvents = finalTextOpacity > 0.6 ? 'auto' : 'none';
      }

      if (composer) composer.render();
      else renderer.render(scene, camera);

      if (firstFrame) {
        firstFrame = false;
        setIsReady(true);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const handleResize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    // Backgrounding a tab pauses rAF, which freezes tick() mid-frame — on
    // return, resume explicitly rather than waiting for the next scroll
    // event (ScrollTrigger's own onUpdate) to happen to kick it again.
    const handleVisibility = () => {
      if (!document.hidden && mounted) tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      visibilityObserver.disconnect();
      scrollTrigger.kill();

      composer?.dispose();
      renderer.dispose();
      pmremGenerator.dispose();
      roomEnvironment.dispose();
      envRenderTarget.dispose();
      tableMaterial.dispose();
      table.geometry.dispose();
      tableTexture.dispose();
      chapters.forEach((chapter) => chapter.dispose());
      chaptersRef.current = null;
    };
  }, [enabled, reducedMotion, isMobile]);

  // Theme toggles mutate existing materials/lights in place on the next
  // tick (isDarkRef is read live in tick()) instead of tearing the scene
  // down — chapter.applyTheme still needs an explicit call since materials
  // aren't touched by the mood-blend loop.
  useEffect(() => {
    chaptersRef.current?.forEach((c) => c.applyTheme(isDark));
  }, [isDark]);

  if (!enabled) return null;

  if (reducedMotion) {
    return (
      <section className="cinematic-fallback" id="experience">
        <p className="cinematic-fallback__eyebrow">AMBRE</p>
        <h1 className="cinematic-fallback__title">{FINAL_COPY[lang].title.join(' ')}</h1>
        <p className="cinematic-fallback__subtitle">{FINAL_COPY[lang].subtitle}</p>
      </section>
    );
  }

  return (
    <section ref={wrapperRef} className="cinematic-wrapper" id="experience">
      <div ref={stageRef} className="cinematic-stage">
        <canvas ref={canvasRef} className="cinematic-canvas" />
        <div className="cinematic-vignette" aria-hidden="true" />

        <div className="cinematic-text">
          {chapterCopy.map(({ meta, copy }) => (
            <div
              key={meta.id}
              ref={(el) => {
                textRefs.current[meta.id] = el;
              }}
              className="cinematic-text__block"
            >
              <p className="cinematic-text__eyebrow">{copy.eyebrow}</p>
              <h2 className="cinematic-text__title">
                {copy.title.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
              <p className="cinematic-text__subtitle">{copy.subtitle}</p>
            </div>
          ))}
          <div
            ref={(el) => {
              textRefs.current.final = el;
            }}
            className="cinematic-text__block cinematic-text__block--final"
          >
            <p className="cinematic-text__eyebrow">{FINAL_COPY[lang].eyebrow}</p>
            <h2 className="cinematic-text__title cinematic-text__title--final">
              {FINAL_COPY[lang].title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p className="cinematic-text__subtitle">{FINAL_COPY[lang].subtitle}</p>
            <a href="#reserve" className="btn btn-primary cinematic-cta">
              {lang === 'ru' ? 'Забронировать стол' : 'Reserve a table'}
            </a>
          </div>
        </div>

        <div ref={scrollHintRef} className="cinematic-scroll-hint">
          <span />
          {lang === 'ru' ? 'Прокрутите' : 'Scroll'}
        </div>

        <div className={`cinematic-loader${isReady ? ' is-hidden' : ''}`} aria-hidden={isReady}>
          <p className="cinematic-loader__brand">AMBRE</p>
          <p className="cinematic-loader__line">{lang === 'ru' ? 'Входим на кухню…' : 'Entering the kitchen…'}</p>
        </div>
      </div>
    </section>
  );
}
