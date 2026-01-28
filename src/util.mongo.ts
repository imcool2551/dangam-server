import mongoose from 'mongoose';
import { last } from 'lodash';

const CURSOR_SEPARATOR = '::';

export const nextCursorOf = (items: any[], ...fields: string[]) => {
  const item = last(items)
  if (!item) return undefined

  return fields.map((key) => item[key] ?? '').join(CURSOR_SEPARATOR)
}

export const parseCursorOf = (field: string, next?: string, direction: number = -1) => {
  if (!next) return undefined

  const separatorIndex = next.lastIndexOf(CURSOR_SEPARATOR)
  if (separatorIndex === -1) return undefined

  const id = next.substring(0, separatorIndex)
  const timestamp = Number(next.substring(separatorIndex + CURSOR_SEPARATOR.length))

  if (isNaN(timestamp)) return undefined

  const condition = direction < 0 ? '$lt' : '$gt'
  return {
    $or: [
      { [field]: { [condition]: timestamp } },
      {
        [field]: timestamp,
        _id: { [condition]: id }
      }
    ]
  }
}
