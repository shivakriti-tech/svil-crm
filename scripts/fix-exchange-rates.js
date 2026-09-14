const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixExchangeRates() {
  console.log("Checking finance exchange rates...");

  const finances = await prisma.finance.findMany();
  let count = 0;

  for (const f of finances) {
    if (f.exchangeRate && f.exchangeRate < 20 && f.exchangeRate > 0) {
      const fixedRate = f.exchangeRate <= 10 ? Number((f.exchangeRate * 10).toFixed(2)) : 87.5;
      const sale = f.saleUsd && f.saleUsd > 0 ? f.saleUsd * fixedRate : f.sale;
      const margin = (sale || 0) - (f.cost || f.buy || 0);

      await prisma.finance.update({
        where: { id: f.id },
        data: {
          exchangeRate: fixedRate,
          sale: sale,
          convertedSaleInr: sale,
          margin: margin,
        },
      });

      console.log(`Updated finance record ID: ${f.id} (Job ID: ${f.jobId}) -> Exchange Rate fixed from ${f.exchangeRate} to ${fixedRate}, Sale: ${sale}`);
      count++;
    }
  }

  console.log(`Finished fixing ${count} finance record(s) with corrupted exchange rates.`);
}

fixExchangeRates()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
