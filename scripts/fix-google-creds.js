const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// Exact values from Google Cloud Console screenshot
const CORRECT_CLIENT_ID = '501614227707-hcc8f2aum27tlk2h6hsic76n1u2bq.apps.googleusercontent.com'
const CORRECT_CLIENT_SECRET = 'GOCSPX-XFzvZ3vuRK5tOaUxnVBToRIAJ'

async function main() {
  // Force delete all old entries
  await p.setting.deleteMany({
    where: { key: { in: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SERVICE_ACCOUNT'] } }
  })
  console.log('✓ Deleted old credentials')

  // Insert fresh correct values
  await p.setting.create({ data: { key: 'GOOGLE_CLIENT_ID', value: CORRECT_CLIENT_ID } })
  await p.setting.create({ data: { key: 'GOOGLE_CLIENT_SECRET', value: CORRECT_CLIENT_SECRET } })
  console.log('✓ Saved correct Client ID:', CORRECT_CLIENT_ID)
  console.log('✓ Saved correct Client Secret: GOCSPX-****')

  // Verify
  const rows = await p.setting.findMany({ where: { key: { in: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] } } })
  console.log('\n--- Verification ---')
  rows.forEach(r => console.log(r.key, '=', r.value))
}

main().catch(console.error).finally(() => p.$disconnect())
