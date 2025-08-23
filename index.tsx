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
    const introScreen = document.getElementById('intro-screen') as HTMLDivElement;
    const homeScreen = document.getElementById('home-screen') as HTMLDivElement;
    const readerScreen = document.getElementById('reader-screen') as HTMLDivElement;
    const verseOfTheDayCard = document.getElementById('verse-of-the-day-card') as HTMLDivElement;
    const currentBookTitle = document.getElementById('current-book-title') as HTMLHeadingElement;
    const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
    const navHomeBtn = document.getElementById('nav-home') as HTMLButtonElement;
    const navReadBtn = document.getElementById('nav-read') as HTMLButtonElement;
    const chapterDisplay = document.getElementById('chapter-display') as HTMLSpanElement;
    
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
    if (!introScreen || !homeScreen || !readerScreen || !verseOfTheDayCard || !contentEl || !currentBookTitle || !menuToggle || !sidebar || !overlay || !prevChapterBtn || !nextChapterBtn || !bottomNav || !navHomeBtn || !navReadBtn || !chapterDisplay) {
        console.error("One or more required elements were not found in the DOM. App cannot start.");
        console.error("Missing elements:", {
            introScreen: !!introScreen,
            homeScreen: !!homeScreen,
            readerScreen: !!readerScreen,
            verseOfTheDayCard: !!verseOfTheDayCard,
            contentEl: !!contentEl,
            currentBookTitle: !!currentBookTitle,
            menuToggle: !!menuToggle,
            sidebar: !!sidebar,
            overlay: !!overlay,
            prevChapterBtn: !!prevChapterBtn,
            nextChapterBtn: !!nextChapterBtn,
            bottomNav: !!bottomNav,
            navHomeBtn: !!navHomeBtn,
            navReadBtn: !!navReadBtn,
            chapterDisplay: !!chapterDisplay
        });
        if (document.body) {
            document.body.innerHTML = '<h1>Error: Application components failed to load. Please refresh the page.</h1>';
        }
        return;
    }

    // Scroll detection for chapter navigation bar
    const chapterNav = document.querySelector('.chapter-navigation') as HTMLElement;
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        if (window.scrollY > lastScrollY) {
            // Scrolling down
            chapterNav.classList.add('hidden-nav');
        } else {
            // Scrolling up
            chapterNav.classList.remove('hidden-nav');
        }
        lastScrollY = window.scrollY;
    });

    // --- Application State ---
    const VERSE_OF_THE_DAY_KEY = 'verse_of_the_day';
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
        } else if (path === '/intro') {
            displayIntroScreen();
        } else {
            displayHomeScreen();
        }
    }

    function displayIntroScreen() {
        introScreen.style.display = 'flex';
        homeScreen.style.display = 'none';
        readerScreen.style.display = 'none';
        bottomNav.style.display = 'none';
        introScreen.classList.add('active');
        homeScreen.classList.remove('active');
        readerScreen.classList.remove('active');

        setTimeout(() => {
            if (window.location.hash === '#/intro') {
                navigateTo('/');
            }
        }, 5000);
    }

    function displayHomeScreen() {
        introScreen.style.display = 'none';
        readerScreen.style.display = 'none';
        homeScreen.style.display = 'flex';
        bottomNav.style.display = 'flex';
        homeScreen.classList.add('active');
        readerScreen.classList.remove('active');
        introScreen.classList.remove('active');
        loadVerseOfTheDay();
    }

    function displayReaderScreen(options: { book: string, chapter: number }) {
        const { book, chapter } = options;

        // 기본적으로 창세기 1장을 보여줍니다
        const bookName = "창세기";
        const chapterNum = 1;
        
        // 화면 전환을 확실하게
        introScreen.style.display = 'none';
        homeScreen.style.display = 'none';
        readerScreen.style.display = 'block';
        bottomNav.style.display = 'flex';
        readerScreen.classList.add('active');
        homeScreen.classList.remove('active');
        introScreen.classList.remove('active');
        
        currentBookTitle.textContent = `${bookName} ${chapterNum}장`;
        loadBook("창세기", { targetChapter: chapterNum, render: true });
        updateChapterNavigation();
    }

    // --- Core Data Fetching and Rendering Functions ---
    
    async function loadVerseOfTheDay() {
        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD
        const storedVerseData = localStorage.getItem(VERSE_OF_THE_DAY_KEY);

        if (storedVerseData) {
            try {
                const { date, verse } = JSON.parse(storedVerseData);
                if (date === today && verse) {
                    verseOfTheDayCard.innerHTML = `
                        <div class="verse-card-header">
                            <h5 class="verse-card-title">오늘의 말씀</h5>
                            <footer>${verse.source}</footer>
                        </div>
                        <p>"${verse.text}"</p>
                    `;
                    verseOfTheDayCard.style.cursor = 'default';
                    return;
                }
            } catch (e) {
                console.error("Failed to parse stored verse data", e);
                localStorage.removeItem(VERSE_OF_THE_DAY_KEY); // Clear corrupted data
            }
        }

        verseOfTheDayCard.innerHTML = `<div class="verse-placeholder"><div class="shine"></div></div>`;

        const books = [
            "old/나훔.json", "old/느헤미야.json", "old/다니엘.json", "old/레위기.json", "old/룻기.json", "old/말라기.json", "old/미가.json", "old/민수기.json", "old/사무엘상.json", "old/사무엘하.json", "old/사사기.json", "old/스가랴.json", "old/스바냐.json", "old/시편.json", "old/신명기.json", "old/아가.json", "old/아모스.json", "old/에스겔.json", "old/에스더.json", "old/에스라.json", "old/여호수아.json", "old/역대상.json", "old/역대하.json", "old/열왕기상.json", "old/열왕기하.json", "old/예레미야.json", "old/예레미야애가.json", "old/오바댜.json", "old/요나.json", "old/요엘.json", "old/욥기.json", "old/이사야.json", "old/잠언.json", "old/전도서.json", "old/창세기.json", "old/출애굽기.json", "old/하박국.json", "old/학개.json", "old/호세아.json",
            "new/갈라디아서.json", "new/고린도전서.json", "new/고린도후서.json", "new/골로새서.json", "new/누가복음.json", "new/데살로니가전서.json", "new/데살로니가후서.json", "new/디도서.json", "new/디모데전서.json", "new/디모데후서.json", "new/로마서.json", "new/마가복음.json", "new/마태복음.json", "new/베드로전서.json", "new/베드로후서.json", "new/빌레몬서.json", "new/빌립보서.json", "new/사도행전.json", "new/야고보서.json", "new/에베소서.json", "new/요한1서.json", "new/요한2서.json", "new/요한3서.json", "new/요한계시록.json", "new/요한복음.json", "new/유다서.json", "new/히브리서.json"
        ];

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            try {
                const randomBookPath = books[Math.floor(Math.random() * books.length)];
                const response = await fetch(randomBookPath);
                if (!response.ok) {
                    attempts++;
                    continue;
                }
                const bookData = await response.json();
                const chapters = Object.keys(bookData);
                if (chapters.length === 0) {
                    attempts++;
                    continue;
                }
                const randomChapterNum = chapters[Math.floor(Math.random() * chapters.length)];
                const verses = bookData[randomChapterNum];
                if (!verses || verses.length === 0) {
                    attempts++;
                    continue;
                }
                const randomVerseNum = Math.floor(Math.random() * verses.length);
                const verseText = verses[randomVerseNum];
                const bookName = randomBookPath.split('/')[1].replace('.json', '');
                const verseNumber = randomVerseNum + 1;
                const verseSource = `${bookName} ${randomChapterNum}:${verseNumber}`;

                const newVerse = {
                    text: verseText,
                    source: verseSource
                };

                localStorage.setItem(VERSE_OF_THE_DAY_KEY, JSON.stringify({ date: today, verse: newVerse }));

                verseOfTheDayCard.innerHTML = `
                    <div class="verse-card-header">
                        <h5 class="verse-card-title">오늘의 말씀</h5>
                        <footer>${newVerse.source}</footer>
                    </div>
                    <p>"${newVerse.text}"</p>
                `;
                verseOfTheDayCard.style.cursor = 'default';
                return;

            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed`, error);
                attempts++;
            }
        }

        verseOfTheDayCard.innerHTML = `
            <p>오늘의 말씀을 불러오는 데 실패했습니다.</p>
        `;
        verseOfTheDayCard.style.cursor = 'default';
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
        chapterDisplay.textContent = `${currentBook} ${currentChapter}장`;
    }

    // --- Event Listeners Setup ---

    navHomeBtn.addEventListener('click', () => {
        navigateTo('/');
    });

    navReadBtn.addEventListener('click', () => {
        navigateTo('/read?book=창세기&chapter=1');
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

    // --- Initial Load ---
    if (!window.location.hash || window.location.hash === '#') {
        navigateTo('/intro', true);
    }

    route(); // Determine which screen to show on initial load
});