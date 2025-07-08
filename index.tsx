/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const homeScreen = document.getElementById('home-screen') as HTMLDivElement;
    const readerScreen = document.getElementById('reader-screen') as HTMLDivElement;
    const verseOfTheDayCard = document.getElementById('verse-of-the-day-card') as HTMLDivElement;
    const startReadingBtn = document.getElementById('start-reading-btn') as HTMLButtonElement;
    const continueReadingBtn = document.getElementById('continue-reading-btn') as HTMLButtonElement;
    const homeBtn = document.getElementById('home-btn') as HTMLButtonElement;
    
    const contentEl = document.getElementById('bible-content') as HTMLDivElement;
    const testamentSelect = document.getElementById('testament-select') as HTMLSelectElement;
    const bookSelect = document.getElementById('book-select') as HTMLSelectElement;
    const chapterSelect = document.getElementById('chapter-select') as HTMLSelectElement;
    const menuToggle = document.getElementById('menu-toggle') as HTMLButtonElement;
    const sidebar = document.getElementById('sidebar') as HTMLElement;
    const overlay = document.getElementById('overlay') as HTMLDivElement;
    const prevChapterBtn = document.getElementById('prev-chapter-btn') as HTMLButtonElement;
    const nextChapterBtn = document.getElementById('next-chapter-btn') as HTMLButtonElement;
    const confirmSelectionBtn = document.getElementById('confirm-selection-btn') as HTMLButtonElement;

    // --- Error Handling for Missing Elements ---
    if (!homeScreen || !readerScreen || !verseOfTheDayCard || !startReadingBtn || !continueReadingBtn || !homeBtn || !contentEl || !testamentSelect || !bookSelect || !chapterSelect || !menuToggle || !sidebar || !overlay || !prevChapterBtn || !nextChapterBtn || !confirmSelectionBtn) {
        console.error("One or more required elements were not found in the DOM. App cannot start.");
        if (document.body) {
            document.body.innerHTML = '<h1>Error: Application components failed to load. Please refresh the page.</h1>';
        }
        return;
    }

    // --- Application State and API Initialization ---
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const LAST_READ_KEY = 'digital_bible_last_read';
    let verseOfTheDayLoaded = false;

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
        homeScreen.classList.add('active');
        readerScreen.classList.remove('active');
        if (!verseOfTheDayLoaded) {
            loadVerseOfTheDay();
        }
    }

    function displayReaderScreen(options: { book: string, chapter: number }) {
        const { book, chapter } = options;

        const bookExists = Array.from(bookSelect.options).some(opt => opt.value === book);

        if (!bookExists) {
            // Handles invalid book names from the URL (e.g. "창세기" from old localStorage).
            // It redirects to a safe default URL, which will trigger the router again.
            console.warn(`Book "${book}" not found, redirecting to a safe default.`);
            navigateTo('/read?book=genesis&chapter=1', true);
            return; // Stop execution of this invalid route.
        }

        // If the book is valid, proceed.
        readerScreen.classList.add('active');
        homeScreen.classList.remove('active');
        bookSelect.value = book;
        loadBook(book, { targetChapter: chapter, render: true });
    }

    // --- Core Data Fetching and Rendering Functions ---
    
    async function loadVerseOfTheDay() {
        if (verseOfTheDayLoaded) return;
        verseOfTheDayLoaded = true;
        verseOfTheDayCard.innerHTML = `<div class="verse-placeholder"><div class="shine"></div></div>`;
        try {
            const prompt = `Give me one inspiring Bible verse in Korean. Respond ONLY in pure JSON format with two keys: "reference" (e.g., "요한복음 3:16") and "text" (the verse content). Do not include any markdown formatting.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                },
            });
            
            let jsonStr = response.text.trim();
            const verseData = JSON.parse(jsonStr);

            if (verseData.text && verseData.reference) {
                verseOfTheDayCard.innerHTML = `
                    <p>"${verseData.text}"</p>
                    <footer>${verseData.reference}</footer>
                `;
            } else {
                throw new Error("Invalid verse data format received.");
            }

        } catch (error) {
            console.error("Error fetching verse of the day:", error);
            verseOfTheDayCard.innerHTML = `<p>오늘의 말씀을 불러오는 데 실패했습니다.</p><footer>클릭하여 다시 시도</footer>`;
            verseOfTheDayLoaded = false;
        }
    }

    async function renderChapter(chapter: number) {
        const bookName = bookSelect.options[bookSelect.selectedIndex]?.text;
        const bookKey = bookSelect.value;
        if (!bookName || !chapter) {
            contentEl.innerHTML = '<p>성경과 장을 선택해주세요.</p>';
            return;
        }

        contentEl.innerHTML = '<p>본문 로딩 중...</p>';
        try {
            const bookDataResponse = await fetch(`${bookKey}.json`);
            if (!bookDataResponse.ok) {
                throw new Error(`Bible data file not found for: ${bookKey}.json`);
            }
            const text = await bookDataResponse.text();
            const bookData = text ? JSON.parse(text) : {};
            const verses = bookData[String(chapter)];

            if (!verses || !Array.isArray(verses) || verses.length === 0) {
                 throw new Error(`Chapter ${chapter} content is missing or invalid in ${bookKey}.json`);
            }

            const chapterTitle = `<h2 class="chapter-title">${bookName} ${chapter}장</h2>`;
            const versesHtml = verses.map((verseText: string, index: number) => {
                return `
                  <div class="verse">
                    <span class="verse-number">${index + 1}</span>
                    <p>${verseText}</p>
                  </div>
                `;
            }).join('');
            contentEl.innerHTML = chapterTitle + versesHtml;

            const lastRead = { book: bookKey, chapter: chapter };
            localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastRead));
            continueReadingBtn.disabled = false;
            
            const newPath = `/read?book=${bookKey}&chapter=${chapter}`;
            navigateTo(newPath, true);

            updateNavButtonsState();

        } catch (error) {
            console.error("Error rendering chapter:", error);
            contentEl.innerHTML = '<p>본문을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>';
            updateNavButtonsState();
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
        updateNavButtonsState();
        
        try {
            const bookDataResponse = await fetch(`${bookKey}.json`);
            if (!bookDataResponse.ok) {
                throw new Error(`Bible data file not found for: ${bookKey}.json`);
            }

            const text = await bookDataResponse.text();
            // Gracefully handle empty or malformed JSON files.
            const bookData = text ? JSON.parse(text) : {};
            const chapterCount = Object.keys(bookData).length;
            const bookName = Array.from(bookSelect.options).find(opt => opt.value === bookKey)?.text || bookKey;

            if (chapterCount <= 0) {
                if (render) {
                    contentEl.innerHTML = `<h2 class="chapter-title">${bookName}</h2><p>책 요약 정보를 생성 중입니다...</p>`;
                    try {
                        const prompt = `Please provide a brief, one-paragraph summary of the book of ${bookKey} from the Bible, in Korean.`;
                        const response = await ai.models.generateContent({
                            model: "gemini-2.5-flash-preview-04-17",
                            contents: prompt,
                        });
                        const summary = response.text;
                        contentEl.innerHTML = `
                            <h2 class="chapter-title">${bookName}</h2>
                            <div class="summary-card">
                                <h3>책 소개</h3>
                                <p>${summary}</p>
                                <p class="notice">이 책의 전체 내용은 현재 준비 중입니다. 곧 업데이트될 예정입니다.</p>
                            </div>
                        `;
                    } catch (summaryError) {
                        console.error(`Error generating summary for ${bookName}:`, summaryError);
                        contentEl.innerHTML = `<h2 class="chapter-title">${bookName}</h2><p>해당 성경의 내용은 현재 준비 중입니다.</p>`;
                    }
                }
                
                chapterSelect.innerHTML = `<option value="">준비 중</option>`;
                chapterSelect.disabled = true;
                confirmSelectionBtn.disabled = true;
                updateNavButtonsState();
                return; // Gracefully exit
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
            const bookName = Array.from(bookSelect.options).find(opt => opt.value === bookKey)?.text || bookKey;
            const errorMessage = `<p>'${bookName}' 책의 데이터를 불러오는 중 오류가 발생했습니다. 파일이 손상되었을 수 있습니다.</p>`;
            if(render) {
                contentEl.innerHTML = errorMessage;
            }
            chapterSelect.innerHTML = '<option>오류</option>';
            chapterSelect.disabled = true;
            confirmSelectionBtn.disabled = true;
            updateNavButtonsState();
        }
    }

    // --- UI Helper Functions ---

    function updateNavButtonsState() {
        const currentChapter = parseInt(chapterSelect.value, 10);
        const totalChapters = chapterSelect.options.length;

        if (isNaN(currentChapter) || totalChapters === 0 || chapterSelect.disabled) {
            prevChapterBtn.disabled = true;
            nextChapterBtn.disabled = true;
            return;
        }

        const isFirstChapter = currentChapter <= 1;
        const isLastChapter = currentChapter >= totalChapters;

        const visibleBookOptions = Array.from(bookSelect.options).filter(opt => opt.parentElement?.matches('optgroup[style*="display: none"]') === false);
        const currentVisibleBookIndex = visibleBookOptions.findIndex(opt => opt.value === bookSelect.value);

        prevChapterBtn.disabled = isFirstChapter && currentVisibleBookIndex === 0;
        nextChapterBtn.disabled = isLastChapter && currentVisibleBookIndex === visibleBookOptions.length - 1;
    }


    function filterBookList() {
        const filter = testamentSelect.value;
        const allOptgroups = bookSelect.querySelectorAll<HTMLElement>('optgroup');
        allOptgroups.forEach(og => og.style.display = 'block');
        
        const oldTestamentGroup = bookSelect.querySelector<HTMLElement>('optgroup[label="구약 성경"]');
        const newTestamentGroup = bookSelect.querySelector<HTMLElement>('optgroup[label="신약 성경"]');

        if (filter === 'old') {
            if (newTestamentGroup) newTestamentGroup.style.display = 'none';
            bookSelect.value = oldTestamentGroup?.querySelector('option')?.value || 'genesis';
        } else if (filter === 'new') {
            if (oldTestamentGroup) oldTestamentGroup.style.display = 'none';
            bookSelect.value = newTestamentGroup?.querySelector('option')?.value || 'matthew';
        } else {
             bookSelect.value = bookSelect.querySelector('option')?.value || 'genesis';
        }
        
        loadBook(bookSelect.value, { render: false });
    }
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', '메뉴 열기');
    }

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('visible');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', '메뉴 닫기');
    }
    
    async function navigateChapter(direction: 'prev' | 'next') {
        const currentChapter = parseInt(chapterSelect.value, 10);
        const totalChapters = chapterSelect.options.length;
        const isFirstChapter = currentChapter <= 1;
        const isLastChapter = currentChapter >= totalChapters;
        
        const visibleBookOptions = Array.from(bookSelect.options).filter(opt => opt.parentElement?.matches('optgroup[style*="display: none"]') === false && opt.value);
        const currentVisibleBookIndex = visibleBookOptions.findIndex(opt => opt.value === bookSelect.value);


        if (direction === 'next') {
            if (!isLastChapter) {
                chapterSelect.value = String(currentChapter + 1);
                await renderChapter(currentChapter + 1);
            } else if (currentVisibleBookIndex > -1 && currentVisibleBookIndex < visibleBookOptions.length - 1) {
                const nextBook = visibleBookOptions[currentVisibleBookIndex + 1];
                bookSelect.value = nextBook.value;
                await loadBook(bookSelect.value, { targetChapter: 1, render: true });
            }
        } else if (direction === 'prev') {
            if (!isFirstChapter) {
                chapterSelect.value = String(currentChapter - 1);
                await renderChapter(currentChapter - 1);
            } else if (currentVisibleBookIndex > 0) {
                const prevBook = visibleBookOptions[currentVisibleBookIndex - 1];
                bookSelect.value = prevBook.value;
                await loadBook(bookSelect.value, { targetChapter: 'last', render: true });
            }
        }
    }

    // --- Event Listeners Setup ---

    // Home Screen
    verseOfTheDayCard.addEventListener('click', () => {
        if (!verseOfTheDayLoaded) { // Only allow click-to-reload on failure
            loadVerseOfTheDay();
        }
    });

    startReadingBtn.addEventListener('click', () => {
        navigateTo('/read?book=genesis&chapter=1');
    });
    continueReadingBtn.addEventListener('click', () => {
        const lastReadJSON = localStorage.getItem(LAST_READ_KEY);
        if (lastReadJSON) {
            const lastRead = JSON.parse(lastReadJSON);
            navigateTo(`/read?book=${lastRead.book}&chapter=${lastRead.chapter}`);
        }
    });

    // Reader Screen & Sidebar
    homeBtn.addEventListener('click', () => {
        navigateTo('/');
        closeSidebar();
    });

    menuToggle.addEventListener('click', () => {
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closeSidebar();
        } else {
            openSidebar();
        }
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
    
    prevChapterBtn.addEventListener('click', () => navigateChapter('prev'));
    nextChapterBtn.addEventListener('click', () => navigateChapter('next'));
    
    window.addEventListener('hashchange', route);

    // --- Initial Load ---
    if (localStorage.getItem(LAST_READ_KEY)) {
        continueReadingBtn.disabled = false;
    }
    route(); // Determine which screen to show on initial load
});