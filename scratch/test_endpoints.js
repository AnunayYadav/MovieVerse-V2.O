async function runTests() {
  const baseUrl = 'http://localhost:3001';
  console.log('Testing endpoints on', baseUrl);

  try {
    // Test 1: Novel Search
    console.log('\n--- Test 1: Novel Search ("Mushoku Tensei: Jobless Reincarnation") ---');
    const res1 = await fetch(`${baseUrl}/api/novel?action=search&query=${encodeURIComponent('Mushoku Tensei: Jobless Reincarnation')}`);
    console.log('Status:', res1.status);
    const data1 = await res1.json();
    console.log('Results Count:', data1.length);
    if (data1.length > 0) {
      console.log('First result:', JSON.stringify(data1[0], null, 2));
      
      // Test 2: Novel Info
      const novelId = data1[0].id;
      console.log(`\n--- Test 2: Novel Info (id="${novelId}") ---`);
      const res2 = await fetch(`${baseUrl}/api/novel?action=info&id=${novelId}`);
      console.log('Status:', res2.status);
      const data2 = await res2.json();
      console.log('Novel Title:', data2.title);
      console.log('Chapters Count:', data2.chapters ? data2.chapters.length : 0);
      if (data2.chapters && data2.chapters.length > 0) {
        console.log('First Chapter:', JSON.stringify(data2.chapters[0], null, 2));
        
        // Test 3: Novel Chapter Content
        const chapterId = data2.chapters[0].id;
        console.log(`\n--- Test 3: Chapter Content (id="${chapterId}") ---`);
        const res3 = await fetch(`${baseUrl}/api/novel?action=chapter&id=${chapterId}`);
        console.log('Status:', res3.status);
        const data3 = await res3.json();
        console.log('Chapter Title:', data3.title);
        console.log('Paragraphs Count:', data3.paragraphs ? data3.paragraphs.length : 0);
        if (data3.paragraphs && data3.paragraphs.length > 0) {
          console.log('First paragraph excerpt:', data3.paragraphs[0].substring(0, 100) + '...');
        }
      }
    }

    // Test 4: Manga Search (Consumet)
    console.log('\n--- Test 4: Manga Search ("one piece" via mangapill) ---');
    const res4 = await fetch(`${baseUrl}/api/manga?action=search&provider=mangapill&query=one%20piece`);
    console.log('Status:', res4.status);
    const data4 = await res4.json();
    console.log('Results Count:', data4.length);
    if (data4.length > 0) {
      console.log('First result:', JSON.stringify(data4[0], null, 2));
    }

    // Test 5: Specific Chapter Referer check
    console.log('\n--- Test 5: Specific Chapter Referer Check ---');
    const specificChapterId = 'campus-rebirth-the-strongest-female-agent/chapter-2813-end-2813-c2759-ending-chapter-no-book-currency-grand-ending';
    const res5 = await fetch(`${baseUrl}/api/novel?action=chapter&id=${encodeURIComponent(specificChapterId)}`);
    console.log('Status:', res5.status);
    const data5 = await res5.json();
    console.log('Chapter Title:', data5.title);
    console.log('Paragraphs Count:', data5.paragraphs ? data5.paragraphs.length : 0);
  } catch (err) {
    console.error('Test script error:', err);
  }
}

runTests();
