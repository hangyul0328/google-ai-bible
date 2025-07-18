// 전역 함수로 햄버거 메뉴 토글 함수 추가
function toggleMenu() {
    console.log('Global toggleMenu function called');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (!menuToggle || !sidebar || !overlay) {
        console.error('Required elements not found:', {
            menuToggle: !!menuToggle,
            sidebar: !!sidebar,
            overlay: !!overlay
        });
        return;
    }
    
    const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
    console.log('Is expanded:', isExpanded);
    console.log('Sidebar classes before:', sidebar.className);
    
    if (isExpanded) {
        console.log('Closing sidebar');
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', '메뉴 열기');
    } else {
        console.log('Opening sidebar');
        sidebar.classList.add('open');
        overlay.classList.add('visible');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', '메뉴 닫기');
    }
    
    console.log('Sidebar classes after:', sidebar.className);
    console.log('Overlay classes after:', overlay.className);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const homeScreen = document.getElementById('home-screen') as HTMLDivElement;
    const readerScreen = document.getElementById('reader-screen') as HTMLDivElement;
    const verseOfTheDayCard = document.getElementById('verse-of-the-day-card') as HTMLDivElement;
    const startReadingBtn = document.getElementById('start-reading-btn') as HTMLButtonElement;
    const continueReadingBtn = document.getElementById('continue-reading-btn') as HTMLButtonElement;
    const floatingHomeBtn = document.getElementById('floating-home-btn') as HTMLButtonElement;
    const currentBookTitle = document.getElementById('current-book-title') as HTMLHeadingElement;
    
    const contentEl = document.getElementById('bible-content') as HTMLDivElement;
    const menuToggle = document.getElementById('menu-toggle') as HTMLButtonElement;
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const overlay = document.getElementById('overlay') as HTMLDivElement;
    const testamentSelect = document.getElementById('testament-select') as HTMLSelectElement;
    const bookSelect = document.getElementById('book-select') as HTMLSelectElement;
    const chapterSelect = document.getElementById('chapter-select') as HTMLSelectElement;
    const confirmSelectionBtn = document.getElementById('confirm-selection-btn') as HTMLButtonElement;
    const prevChapterBtn = document.getElementById('prev-chapter-btn') as HTMLButtonElement;
    const nextChapterBtn = document.getElementById('next-chapter-btn') as HTMLButtonElement;

    // --- Error Handling for Missing Elements ---
    if (!homeScreen || !readerScreen || !verseOfTheDayCard || !startReadingBtn || !continueReadingBtn || !floatingHomeBtn || !contentEl || !currentBookTitle || !menuToggle || !sidebar || !overlay || !prevChapterBtn || !nextChapterBtn) {
        console.error("One or more required elements were not found in the DOM. App cannot start.");
        console.error("Missing elements:", {
            homeScreen: !!homeScreen,
            readerScreen: !!readerScreen,
            verseOfTheDayCard: !!verseOfTheDayCard,
            startReadingBtn: !!startReadingBtn,
            continueReadingBtn: !!continueReadingBtn,
            floatingHomeBtn: !!floatingHomeBtn,
            contentEl: !!contentEl,
            currentBookTitle: !!currentBookTitle,
            menuToggle: !!menuToggle,
            sidebar: !!sidebar,
            overlay: !!overlay,
            prevChapterBtn: !!prevChapterBtn,
            nextChapterBtn: !!nextChapterBtn
        });
        if (document.body) {
            document.body.innerHTML = '<h1>Error: Application components failed to load. Please refresh the page.</h1>';
        }
        return;
    }

    // --- Application State ---
    const LAST_READ_KEY = 'digital_bible_last_read';
    let verseOfTheDayLoaded = false;
    let currentBook = '창세기';
    let currentChapter = 1;
    let maxChapters = 1;

    // --- Screen Management & Routing ---

    function navigateTo(path: string, replace = false) {
        // Use hash-based routing to prevent SecurityError in sandboxed iframe environments.
        const newHash = path.startsWith('/') ? path : '/' + path; // Ensure it's like #/ or #/read
        if (replace) {
            const url = new URL(location.href);
            url.hash = newHash;
            history.replaceState(history.state, '', url.href);
        } else {
            window.location.hash = newHash;
        }
    }
    
    function route() {
        const hash = window.location.hash; // e.g., #/read?book=genesis&chapter=1
        const fullPath = hash.substring(1); // e.g., /read?book=genesis&chapter=1 or /
        const [path, queryString] = fullPath.split('?');
        const params = new URLSearchParams(queryString || '');

        if (path === '/read') {
            const book = params.get('book') || 'genesis';
            const chapter = parseInt(params.get('chapter') || '1', 10);
            displayReaderScreen({ book, chapter });
        } else {
            displayHomeScreen();
        }
    }

    function displayHomeScreen() {
        // 화면 전환을 확실하게
        readerScreen.style.display = 'none';
        homeScreen.style.display = 'flex';
        homeScreen.classList.add('active');
        readerScreen.classList.remove('active');
        if (!verseOfTheDayLoaded) {
            loadVerseOfTheDay();
        }
    }

    function displayReaderScreen(options: { book: string, chapter: number }) {
        const { book, chapter } = options;

        // 기본적으로 창세기 1장을 보여줍니다
        const bookName = "창세기";
        const chapterNum = 1;
        
        // 화면 전환을 확실하게
        homeScreen.style.display = 'none';
        readerScreen.style.display = 'block';
        readerScreen.classList.add('active');
        homeScreen.classList.remove('active');
        
        currentBookTitle.textContent = `${bookName} ${chapterNum}장`;
        loadBook("창세기", { targetChapter: chapterNum, render: true });
        updateChapterNavigation();
    }

    // --- Core Data Fetching and Rendering Functions ---
    
    function loadVerseOfTheDay() {
        if (verseOfTheDayLoaded) return;
        verseOfTheDayLoaded = true;
        verseOfTheDayCard.innerHTML = `
            <p>"하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라"</p>
            <footer>요한복음 3:16</footer>
        `;
    }

    async function renderChapter(chapter: number) {
        const bookName = bookSelect.options[bookSelect.selectedIndex]?.text || bookSelect.value;
        const bookKey = bookSelect.value;
        
        if (!chapter) {
            contentEl.innerHTML = '<p>장을 선택해주세요.</p>';
            return;
        }

        // 현재 상태 업데이트
        currentBook = bookName;
        currentChapter = chapter;

        contentEl.innerHTML = '<p>본문 로딩 중...</p>';
        try {
            const bookDataResponse = await fetch(`old/${bookKey}.json`);
            if (!bookDataResponse.ok) {
                throw new Error(`Bible data file not found for: old/${bookKey}.json`);
            }
            const text = await bookDataResponse.text();
            const bookData = text ? JSON.parse(text) : {};
            const verses = bookData[String(chapter)];

            if (!verses || !Array.isArray(verses) || verses.length === 0) {
                 throw new Error(`Chapter ${chapter} content is missing or invalid in ${bookKey}.json`);
            }

            const versesHtml = verses.map((verseText: string, index: number) => {
                return `
                  <div class="verse">
                    <span class="verse-number">${index + 1}</span>
                    <p>${verseText}</p>
                  </div>
                `;
            }).join('');
            contentEl.innerHTML = versesHtml;

            const lastRead = { book: bookKey, chapter: chapter };
            localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastRead));
            continueReadingBtn.disabled = false;
            
            // 네비게이션 업데이트
            updateChapterNavigation();
            
            const newPath = `/read?book=${bookKey}&chapter=${chapter}`;
            navigateTo(newPath, true);

        } catch (error) {
            console.error("Error rendering chapter:", error);
            contentEl.innerHTML = '<p>본문을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>';
        }
    }

    async function loadBook(bookKey: string, options: { targetChapter?: number | 'last' | 'random', render?: boolean } = {}) {
        const { targetChapter = 1, render = true } = options;

        if (!bookKey) {
            if (render) contentEl.innerHTML = '<p>책을 선택해주세요.</p>';
            chapterSelect.innerHTML = '';
            return;
        }

        confirmSelectionBtn.disabled = true;
        if (render) {
            contentEl.innerHTML = '<p>장 정보 로딩 중...</p>';
        }
        chapterSelect.innerHTML = '<option>로딩 중...</option>';
        chapterSelect.disabled = true;
        
        try {
            const bookDataResponse = await fetch(`old/${bookKey}.json`);
            if (!bookDataResponse.ok) {
                throw new Error(`Bible data file not found for: old/${bookKey}.json`);
            }

            const text = await bookDataResponse.text();
            const bookData = text ? JSON.parse(text) : {};
            const chapterCount = Object.keys(bookData).length;
            const bookName = bookKey;
            
            // 최대 장 수 업데이트
            maxChapters = chapterCount;

            if (chapterCount <= 0) {
                if (render) {
                    contentEl.innerHTML = `
                        <div class="summary-card">
                            <h3>책 소개</h3>
                            <p>이 책의 전체 내용은 현재 준비 중입니다. 곧 업데이트될 예정입니다.</p>
                        </div>
                    `;
                }
                
                chapterSelect.innerHTML = `<option value="">준비 중</option>`;
                chapterSelect.disabled = true;
                confirmSelectionBtn.disabled = true;
                return;
            }

            chapterSelect.innerHTML = '';
            for (let i = 1; i <= chapterCount; i++) {
                chapterSelect.innerHTML += `<option value="${i}">${i}장</option>`;
            }
            chapterSelect.disabled = false;

            if (render) {
                let chapterToRender: number;
                if (targetChapter === 'last') {
                    chapterToRender = chapterCount;
                } else if (targetChapter === 'random') {
                    chapterToRender = Math.floor(Math.random() * chapterCount) + 1;
                } else {
                    chapterToRender = targetChapter as number;
                }
                chapterSelect.value = String(chapterToRender);
                await renderChapter(chapterToRender);
            } else {
                chapterSelect.value = ""; 
                confirmSelectionBtn.disabled = true;
            }

        } catch (error) {
            console.error("Error loading book:", error);
            const errorMessage = `<p>'${bookKey}' 책의 데이터를 불러오는 중 오류가 발생했습니다. 파일이 손상되었을 수 있습니다.</p>`;
            if(render) {
                contentEl.innerHTML = errorMessage;
            }
            chapterSelect.innerHTML = '<option>오류</option>';
            chapterSelect.disabled = true;
            confirmSelectionBtn.disabled = true;
        }
    }

    // --- UI Helper Functions ---

    function closeSidebar() {
        console.log('Closing sidebar');
        console.log('Sidebar element:', sidebar);
        console.log('Overlay element:', overlay);
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', '메뉴 열기');
        console.log('Sidebar classes after close:', sidebar.className);
        console.log('Overlay classes after close:', overlay.className);
    }

    function openSidebar() {
        console.log('Opening sidebar');
        console.log('Sidebar element:', sidebar);
        console.log('Overlay element:', overlay);
        sidebar.classList.add('open');
        overlay.classList.add('visible');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', '메뉴 닫기');
        console.log('Sidebar classes after open:', sidebar.className);
        console.log('Overlay classes after open:', overlay.className);
    }

    function filterBookList() {
        const filter = testamentSelect.value;
        const allOptgroups = bookSelect.querySelectorAll<HTMLElement>('optgroup');
        allOptgroups.forEach(og => og.style.display = 'block');
        
        const oldTestamentGroup = bookSelect.querySelector<HTMLElement>('optgroup[label="구약 성경"]');
        const newTestamentGroup = bookSelect.querySelector<HTMLElement>('optgroup[label="신약 성경"]');

        if (filter === 'old') {
            if (newTestamentGroup) newTestamentGroup.style.display = 'none';
            bookSelect.value = oldTestamentGroup?.querySelector('option')?.value || '창세기';
        } else if (filter === 'new') {
            if (oldTestamentGroup) oldTestamentGroup.style.display = 'none';
            bookSelect.value = newTestamentGroup?.querySelector('option')?.value || '마태복음';
        } else {
             bookSelect.value = bookSelect.querySelector('option')?.value || '창세기';
        }
        
        loadBook(bookSelect.value, { render: false });
    }

    function updateChapterNavigation() {
        // 이전장 버튼 활성화/비활성화
        prevChapterBtn.disabled = currentChapter <= 1;
        
        // 다음장 버튼 활성화/비활성화
        nextChapterBtn.disabled = currentChapter >= maxChapters;
        
        // 제목 업데이트
        currentBookTitle.textContent = `${currentBook} ${currentChapter}장`;
    }

    // --- Event Listeners Setup ---

    // Home Screen
    verseOfTheDayCard.addEventListener('click', () => {
        if (!verseOfTheDayLoaded) { // Only allow click-to-reload on failure
            loadVerseOfTheDay();
        }
    });

    startReadingBtn.addEventListener('click', () => {
        navigateTo('/read?book=창세기&chapter=1');
    });
    continueReadingBtn.addEventListener('click', () => {
        const lastReadJSON = localStorage.getItem(LAST_READ_KEY);
        if (lastReadJSON) {
            const lastRead = JSON.parse(lastReadJSON);
            navigateTo(`/read?book=${lastRead.book}&chapter=${lastRead.chapter}`);
        }
    });

    // Reader Screen
    floatingHomeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Floating home button clicked');
        navigateTo('/');
        closeSidebar();
    });

    // 추가 이벤트 리스너로 확실하게 작동하도록
    floatingHomeBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        console.log('Floating home button mousedown');
    });

    floatingHomeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Floating home button touchstart');
    });

    floatingHomeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Floating home button touchend');
        navigateTo('/');
        closeSidebar();
    });

    // 햄버거 메뉴 클릭 이벤트 - 간단하고 확실한 방법
    menuToggle.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Menu toggle clicked - onclick method');
        console.log('Menu toggle element:', menuToggle);
        console.log('Current aria-expanded:', menuToggle.getAttribute('aria-expanded'));
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        console.log('Is expanded:', isExpanded);
        if (isExpanded) {
            closeSidebar();
        } else {
            openSidebar();
        }
    };

    // 추가 이벤트 리스너로 확실하게 작동하도록
    menuToggle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        console.log('Menu toggle mousedown');
    });

    menuToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Menu toggle touchstart');
    });

    menuToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Menu toggle touchend');
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    // 더 강력한 이벤트 리스너
    menuToggle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        console.log('Menu toggle pointerdown');
    });

    overlay.addEventListener('click', closeSidebar);
    
    testamentSelect.addEventListener('change', filterBookList);
    bookSelect.addEventListener('change', () => loadBook(bookSelect.value, { render: false }));
    chapterSelect.addEventListener('change', () => {
        confirmSelectionBtn.disabled = !chapterSelect.value;
    });

    confirmSelectionBtn.addEventListener('click', async () => {
        const selectedChapter = parseInt(chapterSelect.value, 10);
        if (!isNaN(selectedChapter)) {
            confirmSelectionBtn.disabled = true; // Prevent double clicks
            await renderChapter(selectedChapter);
            closeSidebar();
        }
    });

    // 이전장/다음장 버튼 이벤트 리스너
    prevChapterBtn.addEventListener('click', async () => {
        if (currentChapter > 1) {
            currentChapter--;
            await renderChapter(currentChapter);
            updateChapterNavigation();
        }
    });

    nextChapterBtn.addEventListener('click', async () => {
        if (currentChapter < maxChapters) {
            currentChapter++;
            await renderChapter(currentChapter);
            updateChapterNavigation();
        }
    });
    
    window.addEventListener('hashchange', route);

    // --- Scroll Animation for Floating Home Button ---
    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
        // 스크롤 중일 때 애니메이션 일시 중지
        floatingHomeBtn.style.animationPlayState = 'paused';
        
        // 스크롤이 멈춘 후 1초 뒤에 애니메이션 재개
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            floatingHomeBtn.style.animationPlayState = 'running';
        }, 1000);
    });

    // --- Initial Load ---
    if (localStorage.getItem(LAST_READ_KEY)) {
        continueReadingBtn.disabled = false;
    }
    
    // 강제로 /read 페이지 표시 (테스트용)
    if (window.location.hash.includes('/read')) {
        displayReaderScreen({ book: '창세기', chapter: 1 });
    } else {
        route(); // Determine which screen to show on initial load
    }
});