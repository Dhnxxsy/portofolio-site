/*
  Cleaner script.js
  - Fungsi: lightbox per-subsection, slide nav, keyboard, touch swipe
  - Entrance stagger (sets --i on cards & titles) and body.loaded trigger
  - Pembersihan: duplicate/obsolete handlers removed; jika ada fitur lama yang dihapus
    kamu akan melihat notifikasi di console (tidak mengubah tampilan).
*/
console.info('script.js: cleaned duplicates/unused handlers (non-destructive).');

(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const lightbox = $('#lightbox');
  const track = lightbox ? lightbox.querySelector('.lightbox-track') : null;
  const backdrop = lightbox ? lightbox.querySelector('.lightbox-backdrop') : null;
  const closeBtn = lightbox ? lightbox.querySelector('.lightbox-close') : null;
  const prevBtn = lightbox ? lightbox.querySelector('.lightbox-prev') : null;
  const nextBtn = lightbox ? lightbox.querySelector('.lightbox-next') : null;
  const titleEl = lightbox ? lightbox.querySelector('.lightbox-title') : null;
  const descEl = lightbox ? lightbox.querySelector('.lightbox-desc') : null;

  function groupsFromContainer(container){
    const groups = [];
    let current = { label: null, items: [] };
    Array.from(container.children).forEach(child=>{
      if(child.classList && child.classList.contains('projects-subsection')){
        if(current.items.length) groups.push(current);
        current = { label: child.textContent.trim() || null, items: [] };
      } else if(child.classList && child.classList.contains('project-card')){
        const img = child.querySelector('.project-media img');
        const btn = child.querySelector('.cta');
        const caption = child.querySelector('.project-caption');
        current.items.push({
          src: img ? img.src : '',
          alt: img ? img.alt : '',
          title: btn?.dataset.title || caption?.textContent.trim() || (img ? img.alt : ''),
          desc: btn?.dataset.desc || '',
          el: child
        });
      }
    });
    if(current.items.length) groups.push(current);
    return groups;
  }

  let currentGroup = [];
  let currentIndex = 0;
  function buildSlides(items){
    if(!track) return;
    // Perf: gunakan decoding async; slide non-aktif lazy-load untuk kurangi beban awal
    track.innerHTML = items.map((it, idx) => {
      const lazy = idx === 0 ? '' : ' loading="lazy"';
      return `<div class="slide" role="listitem"><img src="${it.src}" alt="${it.alt||''}" decoding="async"${lazy}></div>`;
    }).join('');
  }
  function showIndex(i, animate = true){
    if(!track || !currentGroup.length) return;
    const n = currentGroup.length;
    if(i < 0) i = n - 1;
    if(i >= n) i = 0;
    currentIndex = i;
    track.style.transition = animate ? 'transform .36s cubic-bezier(.2,.9,.2,1)' : 'none';
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    if(titleEl) titleEl.textContent = currentGroup[currentIndex].title || '';
    if(descEl) descEl.textContent = currentGroup[currentIndex].desc || '';
  }
  function openAt(idx){
    showIndex(idx, false);
    requestAnimationFrame(()=>{
      if(lightbox) lightbox.setAttribute('aria-hidden','false');
      document.documentElement.style.overflow = 'hidden';
      requestAnimationFrame(()=> showIndex(idx, true));
    });
  }
  function closeModal(){
    if(lightbox) lightbox.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow = '';
  }

  function attachLightbox(){
    const containers = $$('.projects-grid');
    const map = new Map();
    containers.forEach(c => map.set(c, groupsFromContainer(c)));

    document.addEventListener('click', e => {
      const btn = e.target.closest('.cta');
      if(!btn) return;
      e.preventDefault();
      const card = btn.closest('.project-card');
      const container = btn.closest('.projects-grid') || containers[0];
      const groups = map.get(container) || groupsFromContainer(container);
      let found = false;
      for(let g=0; g<groups.length; g++){
        const idx = groups[g].items.findIndex(it => it.el === card);
        if(idx !== -1){
          currentGroup = groups[g].items;
          buildSlides(currentGroup);
          openAt(idx);
          found = true;
          break;
        }
      }
      if(!found){
        const fallback = Array.from(container.querySelectorAll('.project-card')).map(c=>{
          const img = c.querySelector('.project-media img');
          const btnInner = c.querySelector('.cta');
          const cap = c.querySelector('.project-caption');
          return {
            src: img?.src || '',
            alt: img?.alt || '',
            title: btnInner?.dataset.title || cap?.textContent.trim() || '',
            desc: btnInner?.dataset.desc || '',
            el: c
          };
        });
        currentGroup = fallback;
        buildSlides(currentGroup);
        const idx = fallback.findIndex(it => it.el === card);
        openAt(idx >= 0 ? idx : 0);
      }
    });

    if(backdrop) backdrop.addEventListener('click', closeModal);
    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(prevBtn) prevBtn.addEventListener('click', ()=> showIndex(currentIndex - 1));
    if(nextBtn) nextBtn.addEventListener('click', ()=> showIndex(currentIndex + 1));

    document.addEventListener('keydown', e=>{
      if(!lightbox || lightbox.getAttribute('aria-hidden') === 'true') return;
      if(e.key === 'Escape') closeModal();
      if(e.key === 'ArrowLeft') showIndex(currentIndex - 1);
      if(e.key === 'ArrowRight') showIndex(currentIndex + 1);
    });

    if(track){
      let sx = 0;
      track.addEventListener('touchstart', e => sx = e.changedTouches[0].clientX, {passive:true});
      track.addEventListener('touchend', e => {
        const ex = e.changedTouches[0].clientX;
        const dx = ex - sx;
        if(Math.abs(dx) > 50) dx > 0 ? showIndex(currentIndex - 1) : showIndex(currentIndex + 1);
      }, {passive:true});
    }
  }

  function applyEntrance(){
    $$('.projects-grid .project-card').forEach((c,i)=> c.style.setProperty('--i', String(i)));
    $$('.section-subtitle').forEach((t,i)=> t.style.setProperty('--i', String(i)));
    // Hindari trigger ganda yang bisa memicu repaint/relayout dua kali
    const addLoaded = ()=>{ document.body.classList.add('loaded'); };
    if(document.readyState === 'complete'){
      // halaman sudah selesai, beri sedikit delay agar lebih halus
      setTimeout(addLoaded, 120);
    } else {
      window.addEventListener('load', ()=> setTimeout(addLoaded, 120), { once:true });
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    applyEntrance();
    attachLightbox();

    // Ensure Email button directs to Gmail compose, with mailto fallback
    const emailBtn = document.getElementById('emailBtn');
    if(emailBtn){
      const gmailUrl = 'https://mail.google.com/mail/u/0/?view=cm&fs=1&to=ragakalasramadhan27@gmail.com&su=Collaboration%20Inquiry&body=Hi%20Raga%2C%0A%0A';
      const mailtoUrl = 'mailto:ragakalasramadhan27@gmail.com?subject=Collaboration%20Inquiry&body=Hi%20Raga%2C%0A%0A';
      emailBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        try {
          // Try navigate to Gmail compose in same tab
          window.location.assign(gmailUrl);
          // If navigation is blocked or Gmail not available, fallback after a moment
          setTimeout(()=>{
            // If still on the page, try mailto
            if(!document.hidden) window.location.href = mailtoUrl;
          }, 1200);
        } catch(err){
          // Fallback immediately
          window.location.href = mailtoUrl;
        }
      });
    }
  });
})();