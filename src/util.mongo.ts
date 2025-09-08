import mongoose from 'mongoose';
import { last } from 'lodash';

export const nextCursorOf = (items: any[], ...fields: string[]) => {
  const item = last(items)
  if (!item) return undefined

  return fields.map((key) => item[key] ?? '').join('_')
}

export const parseCursorOf = (field: string, next?: string, direction: number = -1) => {
  if (!next) return undefined

  const composite = next.split('_', 2)
  const condition = direction < 0 ? '$lt' : '$gt'
  return composite?.length === 2
    ? {
      $or: [
        { [field]: { [condition]: Number(composite[1]) } },
        {
          [field]: Number(composite[1]),
          _id: { [condition]: composite[0] }
        }
      ]
    }
    : {}
}
