// ===== إعدادات TMDB =====
const API_KEY = '5e11ae6a3daf0069b9c7c9f603bb2355';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

// ===== متغيرات الترقيم =====
let currentPage = 1;
let isLoading = false;
let allLoaded = false;
let currentCategory = 'popular';

// ===== المفضلة =====
let favorites = JSON.parse(localStorage.getItem('cimaMixFavorites') || '[]');

function saveFavorites() {
  localStorage.setItem('cimaMixFavorites', JSON.stringify(favorites));
}

function isFavorite(movieId) {
  return favorites.some(m => m.id === movieId);
}

function toggleFavorite(movie) {
  if (isFavorite(movie.id)) {
    favorites = favorites.filter(m => m.id !== movie.id);
  } else {
    favorites.push({
      id: movie.id,
      title: movie.title || movie.name,
      poster_path: movie.poster_path,
      release_date: movie.release_date || movie.first_air_date,
      vote_average: movie.vote_average,
    });
  }
  saveFavorites();
  updateFavoritesUI();
}

// ===== دوال جلب البيانات =====
async function fetchPopularMovies(page = 1) {
  const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=ar&page=${page}`);
  return await res.json();
}

async function fetchTopRated(page = 1) {
  const res = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=ar&page=${page}`);
  return await res.json();
}

async function fetchTVShows(page = 1) {
  const res = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}&language=ar&page=${page}`);
  return await res.json();
}

async function fetchTrending(page = 1) {
  const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=ar&page=${page}`);
  return await res.json();
}

async function fetchHeroMovie() {
  const res = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=ar&page=1`);
  const data = await res.json();
  return data.results[Math.floor(Math.random() * 5)];
}

async function fetchMovieDetails(movieId) {
  const res = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ar`);
  return await res.json();
}

// ===== عرض شبكة الأفلام =====
function displayMovies(movies, containerId = 'moviesGrid', append = false) {
  const grid = document.getElementById(containerId);
  
  if (!append) {
    grid.innerHTML = '';
  }

  if (!movies || movies.length === 0) {
    if (!append) {
      grid.innerHTML = '<p style="color:#a0a0a0;text-align:center;grid-column:1/-1;">لا توجد أفلام للعرض</p>';
    }
    return;
  }

  movies.forEach(movie => {
    if (!movie.poster_path) return;

    // دعم المسلسلات (name) والأفلام (title)
    const movieTitle = movie.title || movie.name || 'بدون عنوان';
    const movieDate = movie.release_date || movie.first_air_date || '';
    const movieYear = movieDate ? movieDate.split('-')[0] : '—';

      const isTV = movie.media_type === 'tv' || movie.first_air_date !== undefined;
    const badgeText = isTV ? 'مسلسل' : 'فيلم';
    const badgeClass = isTV ? 'tv' : 'movie';

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <div class="media-badge ${badgeClass}">${badgeText}</div>
      ${isFavorite(movie.id) ? '<div class="fav-badge">⭐</div>' : ''}
      <img 
        src="${IMG_URL}${movie.poster_path}" 
        alt="${movieTitle}" 
        class="movie-poster" 
        loading="lazy"
      >
      <div class="movie-info">
        <div class="movie-title">${movieTitle}</div>
        <div class="movie-meta">
          <span>${movieYear}</span>
          <span class="movie-rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : '—'}</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(movie.id, movie.media_type || 'movie'));
    grid.appendChild(card);
  });
}

// ===== تحميل المزيد =====
async function loadMoreMovies() {
  if (isLoading || allLoaded) return;
  isLoading = true;

  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'block';

  try {
    const nextPage = currentPage + 1;
    let data;

    if (currentCategory === 'popular') data = await fetchPopularMovies(nextPage);
    else if (currentCategory === 'top_rated') data = await fetchTopRated(nextPage);
    else if (currentCategory === 'tv') data = await fetchTVShows(nextPage);
    else if (currentCategory === 'trending') data = await fetchTrending(nextPage);
    else data = await fetchPopularMovies(nextPage);

    if (data.page >= data.total_pages) {
      allLoaded = true;
    } else {
      currentPage = data.page;
      displayMovies(data.results, 'moviesGrid', true);
    }
  } catch (error) {
    console.error('خطأ في تحميل المزيد:', error);
  } finally {
    isLoading = false;
    if (loader) loader.style.display = 'none';
  }
}

// ===== تحديث قسم البطل =====
function updateHero(movie) {
  if (!movie) return;

  document.querySelector('.hero-title').textContent = movie.title || movie.name || '';
  document.querySelector('.hero-desc').textContent = movie.overview || 'لا يوجد وصف متاح.';
  document.querySelector('.hero-meta').innerHTML = `
    <span>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : '—'}</span>
    <span>${(movie.release_date || movie.first_air_date || '').split('-')[0] || '—'}</span>
    <span>${movie.original_language === 'ar' ? 'عربي' : 'أجنبي'}</span>
  `;

  if (movie.backdrop_path) {
    const heroSection = document.querySelector('.hero');
    heroSection.style.backgroundImage = `url('${BACKDROP_URL}${movie.backdrop_path}')`;
    heroSection.style.backgroundSize = 'cover';
    heroSection.style.backgroundPosition = 'center';
  }
}

// ===== نافذة التفاصيل =====
async function openModal(movieId, type = 'movie') {
  const modal = document.getElementById('movieModal');
  const body = document.getElementById('modalBody');
  modal.classList.add('active');
  body.innerHTML = '<p style="padding:40px;text-align:center;color:#a0a0a0;">جارٍ التحميل...</p>';

  try {
    const res = await fetch(`${BASE_URL}/${type}/${movieId}?api_key=${API_KEY}&language=ar`);
    const movie = await res.json();
    const isFav = isFavorite(movie.id);
    const movieTitle = movie.title || movie.name;
    const movieDate = movie.release_date || movie.first_air_date || '—';

    body.innerHTML = `
      <div class="modal-backdrop" style="background-image:url('${BACKDROP_URL}${movie.backdrop_path || movie.poster_path}')"></div>
      <div class="modal-details">
        <h2 class="modal-title">${movieTitle}</h2>
        <div class="modal-meta">
          <span>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : '—'}</span>
          <span>📅 ${movieDate}</span>
          <span>⏱ ${movie.runtime ? movie.runtime + ' دقيقة' : (movie.number_of_seasons ? movie.number_of_seasons + ' موسم' : '—')}</span>
        </div>
        <p class="modal-overview">${movie.overview || 'لا يوجد وصف متاح.'}</p>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="watchTrailer('${movieTitle}', ${movieDate !== '—' ? movieDate.split('-')[0] : ''})">▶ شاهد الإعلان</button>
          <button class="btn-favorite ${isFav ? 'active' : ''}" onclick='toggleFavoriteAndUpdate(${JSON.stringify(movie).replace(/'/g, "&apos;")})'>
            ${isFav ? '⭐ في المفضلة' : '+ أضف للمفضلة'}
          </button>
        </div>
      </div>
    `;
  } catch (error) {
    body.innerHTML = '<p style="padding:40px;text-align:center;color:#e50914;">حدث خطأ في تحميل التفاصيل</p>';
  }
}

function closeModal() {
  document.getElementById('movieModal').classList.remove('active');
}

function toggleFavoriteAndUpdate(movie) {
  toggleFavorite(movie);
  openModal(movie.id);
}

function watchTrailer(title, year) {
  const query = encodeURIComponent(`${title} ${year} official trailer`);
  window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
}

// ===== المفضلة =====
function updateFavoritesUI() {
  const section = document.getElementById('favoritesSection');
  if (favorites.length > 0) {
    section.style.display = 'block';
    displayMovies(favorites, 'favoritesGrid');
  } else {
    section.style.display = 'none';
  }
}

function clearFavorites() {
  if (confirm('هل تريد مسح كل المفضلة؟')) {
    favorites = [];
    saveFavorites();
    updateFavoritesUI();
    displayMovies(window.currentMovies);
  }
}

// ===== البحث =====
async function searchMovies(query) {
  if (!query.trim()) {
    displayMovies(window.currentMovies);
    return;
  }
  const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=ar&query=${encodeURIComponent(query)}`);
  const data = await res.json();
  displayMovies(data.results);
}

// ===== تبديل عرض المفضلة =====
function toggleFavoritesView() {
  const section = document.getElementById('favoritesSection');
  const isHidden = section.style.display === 'none' || !section.style.display;
  section.style.display = isHidden ? 'block' : 'none';
  if (isHidden) section.scrollIntoView({ behavior: 'smooth' });
}

// ===== تحميل قسم معين =====
async function loadCategory(category, linkElement) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  if (linkElement) linkElement.classList.add('active');

  document.getElementById('favoritesSection').style.display = 'none';
  currentPage = 1;
  allLoaded = false;
  currentCategory = category;

  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '<p style="color:#a0a0a0;text-align:center;grid-column:1/-1;">جارٍ تحميل الأفلام...</p>';

  try {
    let data, title;
    if (category === 'popular') { data = await fetchPopularMovies(1); title = 'أحدث الأفلام'; }
    else if (category === 'top_rated') { data = await fetchTopRated(1); title = 'الأفلام الأعلى تقييمًا'; }
    else if (category === 'tv') { data = await fetchTVShows(1); title = 'المسلسلات الشائعة'; }
    else if (category === 'trending') { data = await fetchTrending(1); title = 'الأكثر رواجًا هذا الأسبوع'; }

    document.getElementById('sectionTitle').textContent = title;
    window.currentMovies = data.results;
    displayMovies(data.results);
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p style="color:#e50914;text-align:center;grid-column:1/-1;">حدث خطأ</p>';
  }
}

// ===== إغلاق النافذة =====
document.addEventListener('click', (e) => {
  const modal = document.getElementById('movieModal');
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===== التمرير اللانهائي =====
window.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 300) {
    loadMoreMovies();
  }
});

// ===== التهيئة =====
async function init() {
  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '<p style="color:#a0a0a0;text-align:center;grid-column:1/-1;">جارٍ تحميل الأفلام...</p>';

  const [popular, heroMovie] = await Promise.all([
    fetchPopularMovies(1),
    fetchHeroMovie()
  ]);

  window.currentMovies = popular.results;
  displayMovies(popular.results);
  updateHero(heroMovie);
  updateFavoritesUI();

  const loader = document.createElement('div');
  loader.id = 'loader';
  loader.style.cssText = 'display:none;text-align:center;padding:20px;color:#a0a0a0;';
  loader.textContent = 'جارٍ تحميل المزيد...';
  grid.parentElement.appendChild(loader);

  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchMovies(e.target.value), 400);
  });
}

init();// ===== زر العودة للأعلى =====
const backToTopButton = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    backToTopButton.classList.add('visible');
  } else {
    backToTopButton.classList.remove('visible');
  }
});

backToTopButton.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});