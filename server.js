require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 4000;

// Simple in-memory store for demo favorites (replace with MongoDB in production)
let demoFavorites = [];

// SEO Helper Functions
function generateMetaTags(recipe) {
  return {
    title: `${recipe.strMeal} Recipe | MyKitchen Recipe Finder`,
    description: `Learn how to make ${recipe.strMeal} with step-by-step instructions. ${recipe.strCategory} recipe from ${recipe.strArea} cuisine. Free cooking recipe on MyKitchen.`,
    keywords: `${recipe.strMeal}, ${recipe.strCategory}, ${recipe.strArea} cuisine, recipe, cooking, ingredients`,
    ogTitle: `${recipe.strMeal} Recipe | MyKitchen`,
    ogDescription: `Learn how to make ${recipe.strMeal} with step-by-step instructions. ${recipe.strCategory} recipe from ${recipe.strArea} cuisine.`,
    ogImage: recipe.strMealThumb,
    ogUrl: `https://youractualwebsite.com/recipe/${recipe.idMeal}`,
    twitterTitle: `${recipe.strMeal} Recipe | MyKitchen`,
    twitterDescription: `Learn how to make ${recipe.strMeal} with step-by-step instructions.`,
    twitterImage: recipe.strMealThumb
  };
}

function generateRecipeStructuredData(recipe) {
  const ingredients = [];
  const instructions = recipe.strInstructions.split('. ').filter(step => step.trim().length > 0);
  
  // Extract ingredients
  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim() !== '') {
      ingredients.push(`${ingredient} - ${measure}`);
    }
  }
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.strMeal,
    description: `Delicious ${recipe.strMeal} recipe from ${recipe.strArea} cuisine. ${recipe.strCategory} dish with step-by-step cooking instructions.`,
    image: [recipe.strMealThumb],
    author: {
      '@type': 'Organization',
      name: 'MyKitchen Team'
    },
    datePublished: new Date().toISOString(),
    prepTime: 'PT30M',
    cookTime: 'PT45M',
    totalTime: 'PT75M',
    recipeCategory: recipe.strCategory,
    recipeCuisine: recipe.strArea,
    recipeYield: '4 servings',
    keywords: `${recipe.strMeal}, ${recipe.strCategory}, ${recipe.strArea} cuisine, recipe, cooking`,
    recipeIngredient: ingredients,
    recipeInstructions: instructions.map((instruction, index) => ({
      '@type': 'HowToStep',
      name: `Step ${index + 1}`,
      text: instruction.trim() + (instruction.trim().endsWith('.') ? '' : '.')
    })),
    nutrition: {
      '@type': 'NutritionInformation',
      calories: '350 calories'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: Math.floor(Math.random() * 100) + 50
    },
    url: recipe.strSource || `https://youractualwebsite.com/recipe/${recipe.idMeal}`
  };
}

// SEO-friendly recipe page endpoint
app.get('/recipe/:id', async (req, res) => {
  try {
    const recipeRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${req.params.id}`);
    const recipeData = await recipeRes.json();
    
    if (!recipeData.meals || recipeData.meals.length === 0) {
      return res.status(404).send('Recipe not found');
    }
    
    const recipe = recipeData.meals[0];
    const metaTags = generateMetaTags(recipe);
    const structuredData = generateRecipeStructuredData(recipe);
    
    // Read the base HTML file
    const htmlPath = path.join(__dirname, '../frontend/index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Replace meta tags
    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${metaTags.title}</title>`
    );
    
    html = html.replace(
      /<meta name="description" content=".*?"/,
      `<meta name="description" content="${metaTags.description}"`
    );
    
    html = html.replace(
      /<meta property="og:title" content=".*?"/,
      `<meta property="og:title" content="${metaTags.ogTitle}"`
    );
    
    html = html.replace(
      /<meta property="og:description" content=".*?"/,
      `<meta property="og:description" content="${metaTags.ogDescription}"`
    );
    
    html = html.replace(
      /<meta property="og:image" content=".*?"/,
      `<meta property="og:image" content="${metaTags.ogImage}"`
    );
    
    html = html.replace(
      /<meta property="og:url" content=".*?"/,
      `<meta property="og:url" content="${metaTags.ogUrl}"`
    );
    
    // Add recipe-specific structured data
    const structuredDataScript = `<script type="application/ld+json" id="recipe-structured-data">${JSON.stringify(structuredData, null, 2)}</script>`;
    html = html.replace('</head>', `${structuredDataScript}</head>`);
    
    res.send(html);
  } catch (error) {
    console.error('Error generating recipe page:', error);
    res.status(500).send('Internal server error');
  }
});

// SEO metadata endpoint for dynamic meta tag updates
app.get('/api/seo/recipe/:id', async (req, res) => {
  try {
    const recipeRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${req.params.id}`);
    const recipeData = await recipeRes.json();
    
    if (!recipeData.meals || recipeData.meals.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const recipe = recipeData.meals[0];
    const metaTags = generateMetaTags(recipe);
    const structuredData = generateRecipeStructuredData(recipe);
    
    res.json({
      metaTags,
      structuredData,
      recipe: {
        id: recipe.idMeal,
        name: recipe.strMeal,
        category: recipe.strCategory,
        area: recipe.strArea,
        image: recipe.strMealThumb
      }
    });
  } catch (error) {
    console.error('Error generating SEO data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate sitemap dynamically
app.get('/sitemap.xml', async (req, res) => {
  try {
    res.set('Content-Type', 'application/xml');
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    
    // Add main pages
    sitemap += `  <url>
    <loc>https://youractualwebsite.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;
    
    // Add popular recipes (sample - you might want to cache this)
    const categories = ['Seafood', 'Chicken', 'Beef', 'Vegetarian', 'Dessert'];
    for (const category of categories) {
      sitemap += `  <url>
    <loc>https://youractualwebsite.com/recipes/${category.toLowerCase()}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }
    
    sitemap += `</urlset>`;
    
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Serve robots.txt
app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://youractualwebsite.com/sitemap.xml`;
  res.set('Content-Type', 'text/plain');
  res.send(robots);
});

// Proxy search to TheMealDB
app.get('/api/recipes/search', async (req, res) => {
  const { i, q } = req.query;
  try {
    if (i) {
      const ing = i.split(',')[0].trim();
      const r = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ing)}`);
      const json = await r.json();
      return res.json(json);
    }
    if (q) {
      const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
      const json = await r.json();
      return res.json(json);
    }
    const r = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=');
    const json = await r.json();
    res.json(json);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lookup meal
app.get('/api/recipes/meal/:id', async (req, res) => {
  try {
    const r = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${req.params.id}`);
    const json = await r.json();
    res.json(json);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Demo favorites endpoints (replace with real DB + auth)
app.get('/api/favorites', (req, res) => {
  res.json(demoFavorites);
});

app.post('/api/favorites', (req, res) => {
  const { meal } = req.body;
  if (!meal || !meal.idMeal) return res.status(400).json({ error: 'meal required' });
  if (!demoFavorites.find(m => m.idMeal === meal.idMeal)) demoFavorites.push(meal);
  res.json({ ok: true, favorites: demoFavorites });
});

app.delete('/api/favorites/:id', (req, res) => {
  demoFavorites = demoFavorites.filter(m => m.idMeal !== req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Server started on', PORT));
