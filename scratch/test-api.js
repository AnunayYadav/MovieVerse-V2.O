async function run() {
  const volunteerUrl = 'https://cmdxd98sb0x3yprd.mangadex.network/data/35e8b23d329407071b8f393bad9dbe93/11-10de292f7fa7b0f7d731897cf055490caf67a5eaffe5dfc46ba5dcd8c5559e78.jpg';
  const centralUrl = 'https://uploads.mangadex.org/data/35e8b23d329407071b8f393bad9dbe93/11-10de292f7fa7b0f7d731897cf055490caf67a5eaffe5dfc46ba5dcd8c5559e78.jpg';

  try {
    const res1 = await fetch(volunteerUrl, { headers: { 'User-Agent': 'MovieVerse/2.0' } });
    console.log('Volunteer Node Status:', res1.status);

    const res2 = await fetch(centralUrl, { headers: { 'User-Agent': 'MovieVerse/2.0' } });
    console.log('Central Server Status:', res2.status);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
