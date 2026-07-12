import fs from 'node:fs'
import path from 'node:path'
import { db } from '../../../utils/db'
import { user } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing userId' })
  }

  const [record] = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, userId))

  const imagePath = record?.image

  const filePath = path.join(process.env.UPLOAD_STORAGE_PATH || 'public/images', imagePath || 'null')

  if (!fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const fileStream = fs.createReadStream(filePath)

  setHeader(event, 'Content-Type', 'application/octet-stream')

  return sendStream(event, fileStream)
})
