const apiKey = "fe42b660a036f4d6a2bfeb4d0f523ce9";
const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&include_adult=true&with_keywords=9748|190342|155823&sort_by=popularity.desc&page=1`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("SUCCESS:", JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("ERROR:", err);
  });
