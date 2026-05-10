  
    const API = 'https://api.freeapi.app/api/v1/public/quotes';
    let allQuotes = [];
    let filtered = [];
    let currentPage = 1;
    let perPage = 12;
    let viewMode = 'grid'; // 'grid'
    let sortMode = 'default';
    let activeModal = null;

    // ── FETCH ──
    async function fetchAllQuotes() {
      try {
        // Fetch first page to get total pages
        const res = await fetch(`${API}?page=1&limit=20`);
        const json = await res.json();
        if (!json.success) throw new Error('API error');

        const totalPages = json.data?.totalPages || 1;
        document.getElementById('totalPages').textContent = totalPages;

        // Fetch all pages in parallel
        const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1);
        const results = await Promise.all(
          pageNums.map(p => fetch(`${API}?page=${p}&limit=20`).then(r => r.json()))
        );

        allQuotes = results.flatMap(r => r.data?.data || []);
        document.getElementById('totalQuotes').textContent = allQuotes.length;

        filtered = [...allQuotes];
        render();
      } catch (e) {
        document.getElementById('main').innerHTML = `
          <div class="error-wrap">
            <h2>Could not load quotes</h2>
            <p>${e.message || 'An unexpected error occurred.'}</p>
          </div>`;
      }
    }

    // ── SORT ──
    function sortQuotes(arr) {
      const sorted = [...arr];
      if (sortMode === 'alpha-author') sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
      else if (sortMode === 'alpha-quote') sorted.sort((a, b) => (a.content || '').localeCompare(b.content || ''));
      else if (sortMode === 'length') sorted.sort((a, b) => (a.content || '').length - (b.content || '').length);
      return sorted;
    }

    // ── RENDER ──
    function render() {
      const main = document.getElementById('main');
      const paginationEl = document.getElementById('pagination');
      const info = document.getElementById('resultsInfo');

      const sorted = sortQuotes(filtered);
      const total = sorted.length;
      const totalPgs = Math.ceil(total / perPage);
      if (currentPage > totalPgs) currentPage = 1;

      const start = (currentPage - 1) * perPage;
      const page = sorted.slice(start, start + perPage);

      info.textContent = `${total} quote${total !== 1 ? 's' : ''} — Page ${currentPage} of ${totalPgs || 1}`;

      if (page.length === 0) {
        main.innerHTML = `<div class="error-wrap"><h2>No quotes found</h2><p>Try a different search term.</p></div>`;
        paginationEl.innerHTML = '';
        return;
      }

      if (viewMode === 'grid') {
        main.innerHTML = `<div class="quotes-grid" id="quotesContainer"></div>`;
        const grid = main.querySelector('#quotesContainer');
        page.forEach((q, i) => {
          const globalIdx = start + i + 1;
          const isFeatured = i === 0 && currentPage === 1 && sortMode === 'default' && !filtered.length < allQuotes.length;
          const card = document.createElement('div');
          card.className = 'quote-card' + (isFeatured ? ' featured' : '');
          card.innerHTML = `
            <div class="card-num">No. ${String(globalIdx).padStart(3, '0')}</div>
            <div class="card-mark">"</div>
            <div class="card-quote">${escHtml(q.content)}</div>
            <div class="card-author">${escHtml(q.author || 'Unknown')}</div>`;
          card.addEventListener('click', () => openModal(q, globalIdx));
          grid.appendChild(card);
        });
      } else {
        main.innerHTML = `<div class="quotes-list" id="quotesContainer"></div>`;
        const list = main.querySelector('#quotesContainer');
        page.forEach((q, i) => {
          const globalIdx = start + i + 1;
          const row = document.createElement('div');
          row.className = 'quote-row';
          const words = (q.content || '').split(' ').length;
          const tag = words < 15 ? 'Aphorism' : words < 35 ? 'Passage' : 'Extended';
          row.innerHTML = `
            <div class="row-num">${String(globalIdx).padStart(3, '0')}</div>
            <div class="row-body">
              <div class="row-quote">${escHtml(q.content)}</div>
              <div class="row-author">— ${escHtml(q.author || 'Unknown')}</div>
            </div>
            <div class="row-tag">${tag}</div>`;
          row.addEventListener('click', () => openModal(q, globalIdx));
          list.appendChild(row);
        });
      }

      renderPagination(totalPgs);
    }

    // ── PAGINATION ──
    function renderPagination(totalPgs) {
      const el = document.getElementById('pagination');
      el.innerHTML = '';
      if (totalPgs <= 1) return;

      const prev = mkPageBtn('‹', currentPage === 1);
      prev.addEventListener('click', () => { currentPage--; window.scrollTo(0, 0); render(); });
      el.appendChild(prev);

      const pages = getPageNums(currentPage, totalPgs);
      pages.forEach(p => {
        if (p === '…') {
          const span = document.createElement('span');
          span.className = 'page-ellipsis';
          span.textContent = '…';
          el.appendChild(span);
        } else {
          const btn = mkPageBtn(p, false, p === currentPage);
          btn.addEventListener('click', () => { currentPage = p; window.scrollTo(0, 0); render(); });
          el.appendChild(btn);
        }
      });

      const next = mkPageBtn('›', currentPage === totalPgs);
      next.addEventListener('click', () => { currentPage++; window.scrollTo(0, 0); render(); });
      el.appendChild(next);
    }

    function mkPageBtn(label, disabled, active = false) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (active ? ' active' : '');
      btn.textContent = label;
      btn.disabled = disabled;
      return btn;
    }

    function getPageNums(cur, total) {
      if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
      if (cur <= 4) return [1, 2, 3, 4, 5, '…', total];
      if (cur >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
      return [1, '…', cur - 1, cur, cur + 1, '…', total];
    }

    // ── MODAL ──
    function openModal(q, idx) {
      activeModal = q;
      document.getElementById('modalNum').textContent = `Quote No. ${String(idx).padStart(3, '0')}`;
      document.getElementById('modalQuote').textContent = q.content;
      document.getElementById('modalAuthor').textContent = q.author || 'Unknown';
      document.getElementById('modalOverlay').classList.add('open');
    }

    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      activeModal = null;
    }

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modalOverlay')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    document.getElementById('copyBtn').addEventListener('click', async () => {
      if (!activeModal) return;
      await navigator.clipboard.writeText(`"${activeModal.content}"`);
      flashCopy('copyBtn');
    });

    document.getElementById('copyFullBtn').addEventListener('click', async () => {
      if (!activeModal) return;
      await navigator.clipboard.writeText(`"${activeModal.content}" — ${activeModal.author || 'Unknown'}`);
      flashCopy('copyFullBtn');
    });

    function flashCopy(id) {
      const btn = document.getElementById(id);
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = id === 'copyBtn' ? 'Copy Quote' : 'Copy with Author';
        btn.classList.remove('copied');
      }, 1800);
    }

    // ── SEARCH ──
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        filtered = q
          ? allQuotes.filter(x =>
              (x.content || '').toLowerCase().includes(q) ||
              (x.author || '').toLowerCase().includes(q))
          : [...allQuotes];
        currentPage = 1;
        render();
      }, 250);
    });

    // ── SORT ──
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sortMode = btn.dataset.sort;
        currentPage = 1;
        render();
      });
    });

    // ── VIEW TOGGLE ──
    document.getElementById('gridBtn').addEventListener('click', () => {
      viewMode = 'grid';
      document.getElementById('gridBtn').classList.add('active');
      document.getElementById('listBtn').classList.remove('active');
      render();
    });

    document.getElementById('listBtn').addEventListener('click', () => {
      viewMode = 'list';
      document.getElementById('listBtn').classList.add('active');
      document.getElementById('gridBtn').classList.remove('active');
      render();
    });

    // ── UTIL ──
    function escHtml(str) {
      return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── INIT ──
    fetchAllQuotes();
  