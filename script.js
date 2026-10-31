/* ---------- Menu hambúrguer (telemóvel) ---------- */
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");

function setMenu(open) {
  navMenu.classList.toggle("is-open", open);
  navToggle.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

navToggle.addEventListener("click", () => {
  setMenu(!navMenu.classList.contains("is-open"));
});

// Fecha ao escolher uma página, ao carregar fora do menu ou com Esc
navMenu.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".navbar")) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

/* ---------- Galeria ---------- */
// Desktop/tablet: 3 quadros de cada vez. Telemóvel: 1 (definido no CSS em --per-page).
const track = document.getElementById("gallery-track");

if (track) {
  const gallery = track.closest(".gallery");
  const items = Array.from(track.children);
  const prevBtn = document.getElementById("gallery-prev");
  const nextBtn = document.getElementById("gallery-next");
  let first = 0; // índice do primeiro quadro visível

  // Se uma imagem não for encontrada, o quadro mostra o caminho que o browser tentou abrir
  items.forEach((item) => {
    const img = item.querySelector("img");
    const title = item.querySelector(".art-card__title");
    const markMissing = () => {
      title.dataset.missing = img.getAttribute("src");
      console.warn("Imagem não encontrada:", img.getAttribute("src"));
    };
    img.addEventListener("error", markMissing);
    if (img.complete && img.naturalWidth === 0) markMissing();
  });

  const perPage = () =>
    Number(getComputedStyle(gallery).getPropertyValue("--per-page")) || 3;

  function render() {
    const n = perPage();
    const pages = Math.ceil(items.length / n);
    const page = Math.min(Math.floor(first / n), pages - 1);
    first = page * n;

    track.style.transform = `translateX(calc(${-page} * (100% + var(--gap))))`;

    // Só os quadros do grupo atual ficam visíveis, clicáveis e focáveis
    items.forEach((item, i) => {
      const current = Math.floor(i / n) === page;
      item.classList.toggle("is-current", current);
      item.inert = !current;
    });

    prevBtn.hidden = page === 0;
    nextBtn.hidden = page === pages - 1;
  }

  function go(dir) {
    first = Math.max(0, first + dir * perPage());
    render();
    // Se a seta clicada desapareceu (fim da galeria), passa o foco à outra
    const active = dir > 0 ? nextBtn : prevBtn;
    (active.hidden ? (dir > 0 ? prevBtn : nextBtn) : active).focus({ preventScroll: true });
  }

  prevBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));
  window.addEventListener("resize", render);

  // Deslizar com o dedo
  let touchX = null;
  gallery.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 50) return;
    const dir = dx < 0 ? 1 : -1;
    if ((dir > 0 && !nextBtn.hidden) || (dir < 0 && !prevBtn.hidden)) go(dir);
  });

  // Botão de voltar das páginas dos quadros: abre a galeria no grupo onde esse quadro está
  document.querySelectorAll(".back-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      first = Number(btn.dataset.galleryIndex) || 0;
      render();
    });
  });

  // "explore now" (página inicial): abre a galeria sempre nos 3 primeiros quadros
  const exploreBtn = document.getElementById("btn-explore");
  if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
      first = 0;
      render();
    });
  }

  render();
}

/* ---------- Guide: post-its ---------- */
const noteModal = document.getElementById("note-modal");

if (noteModal) {
  const card = noteModal.querySelector(".note-card");
  const cardBody = document.getElementById("note-card-body");
  const closeBtn = noteModal.querySelector("[data-close]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const COLORS = ["note--yellow", "note--pink", "note--blue", "note--green"];

  let current = null;     // post-it que está aberto
  let animating = false;

  // Transformação que põe o cartão grande exatamente por cima do post-it da parede
  function fromNoteTransform(noteEl) {
    const from = noteEl.getBoundingClientRect();
    const to = card.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const scale = noteEl.offsetWidth / card.offsetWidth;
    const rot = parseFloat(getComputedStyle(noteEl).getPropertyValue("--rot")) || 0;
    return `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`;
  }

  function reset(noteEl) {
    card.getAnimations().forEach((a) => a.cancel());
    cardBody.getAnimations().forEach((a) => a.cancel());
    noteModal.classList.remove("is-open");
    noteModal.hidden = true;
    document.documentElement.classList.remove("has-note-open");
    noteEl.classList.remove("is-peeled");
    current = null;
    animating = false;
  }

  function openNote(noteEl) {
    if (current || animating) return;
    current = noteEl;

    // O conteúdo do verso está num <template> ao lado do post-it
    const template = noteEl.closest(".guide__item").querySelector("template");
    cardBody.replaceChildren(template.content.cloneNode(true));
    COLORS.forEach((c) => card.classList.remove(c));
    card.classList.add(COLORS.find((c) => noteEl.classList.contains(c)));

    noteModal.hidden = false;
    document.documentElement.classList.add("has-note-open");

    if (!reduceMotion.matches) {
      animating = true;
      const start = fromNoteTransform(noteEl);
      card
        .animate([{ transform: start }, { transform: "none" }], {
          duration: 480,
          easing: "cubic-bezier(0.2, 0.8, 0.25, 1)",
        })
        .finished.then(() => { animating = false; }, () => { animating = false; });
      cardBody.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 180, fill: "backwards" });
    }

    noteEl.classList.add("is-peeled");
    noteModal.classList.add("is-open");
    closeBtn.focus({ preventScroll: true });
  }

  function closeNote() {
    if (!current || animating) return;
    const noteEl = current;

    const finish = () => {
      reset(noteEl);
      noteEl.focus({ preventScroll: true });
    };

    if (reduceMotion.matches) {
      finish();
      return;
    }

    animating = true;
    noteModal.classList.remove("is-open");
    cardBody.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
    card
      .animate([{ transform: "none" }, { transform: fromNoteTransform(noteEl) }], {
        duration: 380,
        easing: "cubic-bezier(0.5, 0, 0.75, 0)",
        fill: "forwards",
      })
      .finished.then(finish, finish);
  }

  document.querySelectorAll(".note").forEach((noteEl) => {
    noteEl.addEventListener("click", () => openNote(noteEl));
  });

  // Clicar fora do post-it (ou no X) volta a colá-lo
  noteModal.addEventListener("click", (e) => {
    if (!e.target.closest(".note-card") || e.target.closest("[data-close]")) closeNote();
  });

  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") closeNote();
    if (e.key === "Tab") {
      // Mantém o teclado dentro do post-it aberto
      const focusable = Array.from(card.querySelectorAll("a[href], button"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Se o utilizador mudar de página (botão "voltar" do browser), fecha logo
  window.addEventListener("hashchange", () => {
    if (current) reset(current);
  });
}
