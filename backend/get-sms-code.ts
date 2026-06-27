import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const r = await p.smsCode.findFirst({
    where: { phone: '13800000000' },
    orderBy: { id: 'desc' },
  });
  if (r) {
    console.log('code=' + r.code);
  } else {
    console.log('no code');
  }
  await p.$disconnect();
}
main();
