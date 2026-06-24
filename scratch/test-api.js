async function run() {
  const url = 'https://api.mangadex.org/manga?limit=20&order[rating]=desc&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&availableTranslatedLanguage[]=en';
  console.log('Fetching:', url);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MovieVerse/2.0 (contact@movieverse.app)'
      }
    });
    const json = await res.json();
    console.log('Data length:', json.data?.length);
    if (json.data) {
      json.data.forEach((manga, idx) => {
        const title = manga.attributes?.title?.en || Object.values(manga.attributes?.title || {})[0];
        console.log(`${idx + 1}. [ID: ${manga.id}] ${title} (${manga.attributes.contentRating})`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
