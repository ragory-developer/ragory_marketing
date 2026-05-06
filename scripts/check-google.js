const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const rows = await p.setting.findMany({
    where: { key: { in: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'] } }
  })
  if (rows.length === 0) {
    console.log('NO GOOGLE SETTINGS FOUND IN DATABASE')
  } else {
    rows.forEach(r => {
      console.log(`${r.key} = ${r.value?.substring(0, 50)}...`)
    })
  }
}

main().finally(() => p.$disconnect())
