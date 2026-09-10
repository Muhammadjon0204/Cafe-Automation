import { z } from 'zod';

// An untouched optional <input type="number"> submits '' (not undefined), and
// z.coerce.number() coerces '' to 0 (Number('') === 0) — silently turning "left
// blank" into "explicitly zero". Preprocessing '' to undefined first lets .optional()
// actually apply.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

// Mirrors DishService.ValidateAsync (Backend/src/Application/Services/DishService.cs)
// so obviously-invalid input never has to make a round trip. Server-only checks (name
// uniqueness, category existence) still land in the root-level banner — the backend
// doesn't return field-keyed errors, just a message + a flat string list.
export const dishSchema = z
  .object({
    name: z.string().trim().min(1, 'Укажите название').max(150, 'Максимум 150 символов'),
    description: z.string().max(1000, 'Максимум 1000 символов').optional(),
    price: z.coerce.number().positive('Цена должна быть больше нуля'),
    costPrice: z.preprocess(emptyToUndefined, z.coerce.number().min(0, 'Не может быть отрицательной').optional()),
    cookingTimeMinutes: z.coerce.number().int().min(0, 'Не может быть отрицательным'),
    calories: z.preprocess(emptyToUndefined, z.coerce.number().min(0, 'Не может быть отрицательными').optional()),
    imageUrl: z.string().max(500, 'Ссылка слишком длинная').optional(),
    ingredientsDescription: z.string().max(1000, 'Максимум 1000 символов').optional(),
    isAvailable: z.boolean(),
    isSeasonal: z.boolean(),
    categoryId: z.coerce.number().int().min(1, 'Выберите категорию'),
    status: z.coerce.number().int(),
    type: z.coerce.number().int(),
  })
  .refine((data) => data.costPrice === undefined || data.costPrice <= data.price, {
    message: 'Себестоимость не может быть больше цены',
    path: ['costPrice'],
  });

// z.coerce.number() makes the pre-parse ("input") shape looser than the parsed
// ("output") shape — useForm's 3rd generic tells it handleSubmit's callback receives
// the parsed/coerced output, while the form fields themselves hold the raw input.
export type DishFormInput = z.input<typeof dishSchema>;
export type DishFormOutput = z.output<typeof dishSchema>;
