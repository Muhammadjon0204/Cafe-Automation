import { apiClient, type PagedData } from '@cafe/shared';
import type { CafeTable } from './reservationsApi';

// TableShape (Backend/src/Domain/Enums/TableShape.cs) — numeric, no JsonStringEnumConverter
// is registered on the API. Rectangle/Square share the same rendering (independent Width/
// Height box); Circle uses Width as the diameter and ignores Height at render time.
export const TABLE_SHAPE = { Rectangle: 1, Circle: 2, Square: 3 } as const;
export type TableShapeValue = (typeof TABLE_SHAPE)[keyof typeof TABLE_SHAPE];

// Extends the narrower `CafeTable` from reservationsApi.ts with floor-plan fields, so
// ReservationsPage/ReservationFormModal keep compiling unchanged against the type they
// already import — this is the one place that carries the fuller shape.
export interface CafeTableLayout extends CafeTable {
  note: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  shape: TableShapeValue;
  zoneId: number | null;
  zoneName: string | null;
}

export interface Zone {
  id: number;
  name: string;
  sortOrder: number;
  backgroundImageUrl: string | null;
  tablesCount: number;
}

export interface CreateTableValues {
  tableNumber: number;
  seatsCount: number;
  location?: string;
  note?: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  shape?: TableShapeValue;
  zoneId?: number | null;
}

export interface UpdateTableLayoutValues {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  shape: TableShapeValue;
  zoneId: number | null;
}

// PUT /cafe-tables/{id} is business-fields-only (TableNumber/SeatsCount/Status/Location/
// Note) — layout fields (position/size/shape/zone) go exclusively through the PATCH
// .../layout endpoint below. The editor's "edit table" form issues both calls when it
// touches fields from each side; see TableFormModal/TablesPage.
export interface UpdateTableValues {
  tableNumber: number;
  seatsCount: number;
  status: number;
  location?: string | null;
  note?: string | null;
}

export interface ZoneFormValues {
  name: string;
  sortOrder: number;
}

// Loads every table in one call (D11) — realistically small per-cafe count, and this
// gives the floor-plan canvas instant client-side zone-tab switching with no refetch.
export function getTables(): Promise<PagedData<CafeTableLayout>> {
  return apiClient.get<PagedData<CafeTableLayout>>('/cafe-tables', { params: { pageSize: 100 } });
}

export function getZones(): Promise<Zone[]> {
  return apiClient.get<Zone[]>('/zones');
}

export function createTable(values: CreateTableValues): Promise<CafeTableLayout> {
  return apiClient.post<CafeTableLayout>('/cafe-tables', values);
}

export function updateTableLayout(id: number, values: UpdateTableLayoutValues): Promise<CafeTableLayout> {
  return apiClient.patch<CafeTableLayout>(`/cafe-tables/${id}/layout`, values);
}

export function updateTable(id: number, values: UpdateTableValues): Promise<CafeTableLayout> {
  return apiClient.put<CafeTableLayout>(`/cafe-tables/${id}`, values);
}

export function updateTableStatus(id: number, status: number): Promise<CafeTableLayout> {
  return apiClient.patch<CafeTableLayout>(`/cafe-tables/${id}/status`, { status });
}

export function deleteTable(id: number): Promise<void> {
  return apiClient.delete<void>(`/cafe-tables/${id}`);
}

export function createZone(values: ZoneFormValues): Promise<Zone> {
  return apiClient.post<Zone>('/zones', values);
}

export function updateZone(id: number, values: ZoneFormValues): Promise<Zone> {
  return apiClient.put<Zone>(`/zones/${id}`, values);
}

export function deleteZone(id: number, force = false): Promise<void> {
  return apiClient.delete<void>(`/zones/${id}`, { params: { force } });
}

// multipart/form-data — axios sets the boundary itself from the FormData body, so no
// Content-Type header is passed here.
export function uploadZoneBackground(id: number, file: File): Promise<Zone> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<Zone>(`/zones/${id}/background`, formData);
}

export function removeZoneBackground(id: number): Promise<Zone> {
  return apiClient.delete<Zone>(`/zones/${id}/background`);
}
