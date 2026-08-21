// Seeds the database with the restaurant's starting menu.
// Safe to re-run: it only inserts categories/items that don't already exist.
import { prisma } from '../src/lib/prisma';
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS } from '../src/data/initialData';

async function main() {
  console.log('Seeding categories...');
  for (const cat of INITIAL_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
      },
    });
  }

  console.log('Seeding menu items...');
  for (const item of INITIAL_MENU_ITEMS) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        price: item.price,
        is_veg: item.is_veg,
        is_available: item.is_available,
        image_url: item.image_url,
        spice_level: item.spice_level,
        calories: item.calories,
        prep_time_est: item.prep_time_est,
        rating: item.rating,
        review_count: item.review_count,
        tags: item.tags ?? [],
      },
    });
  }

  const categoryCount = await prisma.category.count();
  const menuItemCount = await prisma.menuItem.count();
  console.log(`Done. ${categoryCount} categories, ${menuItemCount} menu items in the database.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
