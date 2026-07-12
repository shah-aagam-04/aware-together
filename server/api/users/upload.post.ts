import path from 'path'
import fs from 'fs'
import { db } from '~~/server/utils/db'
import { user } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const form = await readMultipartFormData(event)

  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'No form data' })
  }

  const file = form.find((i) => i.name === 'file')

  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'File missing' })
  }

  const dirPath = path.join(
    process.env.UPLOAD_STORAGE_PATH || 'public/images',
    'users',
    session.user.id,
    'images'
  )

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  const randomImageId = crypto.randomUUID()

  const filePath = path.join(dirPath, randomImageId)

  if (fs.existsSync(filePath)) {
    throw createError({ statusCode: 400, message: 'Image already exists.' })
  }

  await fs.writeFile(filePath, file.data, (err) => {
    if (err) throw err
  })

  const imagePath = path.join('users', session.user.id, 'images', randomImageId)

  const [updatedUser] = await db
    .update(user)
    .set({ image: imagePath, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))
    .returning()

  console.log(updatedUser)

  setResponseStatus(event, 201)

  return {
    message: 'Added profile picture to logged in user.',
  }
})
