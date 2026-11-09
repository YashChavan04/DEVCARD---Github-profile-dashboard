// DEVCARD — GitHub Profile Dashboard

const usernameInput = document.getElementById("usernameInput");
const searchBtn = document.getElementById("searchBtn");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const dashboard = document.getElementById("dashboard");
const welcome = document.getElementById("welcome");

let allRepos = [];
let currentUser = null;

const HISTORY_KEY = "devcard_search_history";

const COLORS = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#9333ea",
    "#0891b2",
    "#e11d48",
    "#64748b",
    "#ca8a04"
];


// EVENT LISTENERS

searchBtn.addEventListener("click", searchUser);

usernameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchUser();
    }
});

document.getElementById("sampleSearch").addEventListener("click", () => {
    usernameInput.value = "octocat";
    searchUser();
});

document.getElementById("clearHistory").addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
});

document.getElementById("repoSearch").addEventListener("input", renderRepositories);

document.getElementById("languageFilter").addEventListener("change", renderRepositories);

document.getElementById("sortRepos").addEventListener("change", renderRepositories);


// NAVIGATION

document.querySelectorAll(".nav-link").forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        const target = document.getElementById(link.dataset.target);

        if (!target || dashboard.classList.contains("hidden")) {
            return;
        }

        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });

});


// SEARCH HISTORY

function getHistory() {

    try {

        const history = JSON.parse(
            localStorage.getItem(HISTORY_KEY) || "[]"
        );

        return Array.isArray(history) ? history : [];

    } catch {

        return [];

    }

}


function saveHistory(username) {

    const history = getHistory().filter(item =>
        item.toLowerCase() !== username.toLowerCase()
    );

    history.unshift(username);

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history.slice(0, 6))
    );

    renderHistory();

}


function renderHistory() {

    const container = document.getElementById("searchHistory");

    const history = getHistory();

    container.innerHTML = "";

    document.getElementById("historyRow")
        .classList.toggle("hidden", history.length === 0);

    history.forEach(username => {

        const button = document.createElement("button");

        button.className = "history-chip";

        button.textContent = username;

        button.addEventListener("click", () => {

            usernameInput.value = username;

            searchUser();

        });

        container.appendChild(button);

    });

}


// SEARCH GITHUB USER

async function searchUser() {

    const username = usernameInput.value.trim();

    if (!username) {

        showError("Please enter a GitHub username.");

        return;

    }

    setLoading(true);

    error.classList.add("hidden");

    dashboard.classList.add("hidden");

    welcome.classList.add("hidden");


    try {

        const [userResponse, repoResponse] = await Promise.all([

            fetch(
                `https://api.github.com/users/${encodeURIComponent(username)}`
            ),

            fetch(
                `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`
            )

        ]);


        if (userResponse.status === 404) {

            throw new Error(
                "GitHub user not found. Check the username and try again."
            );

        }


        if (
            userResponse.status === 403 ||
            repoResponse.status === 403
        ) {

            throw new Error(
                "GitHub API rate limit exceeded. Please wait a little and try again."
            );

        }


        if (!userResponse.ok) {

            throw new Error("Unable to fetch GitHub profile.");

        }


        if (!repoResponse.ok) {

            throw new Error("Unable to fetch repositories.");

        }


        const user = await userResponse.json();

        const repos = await repoResponse.json();


        currentUser = user;

        allRepos = Array.isArray(repos) ? repos : [];


        displayProfile(user);

        displayStats(user, allRepos);

        populateLanguageFilter(allRepos);

        renderRepositories();

        renderLanguageAnalytics(allRepos);


        dashboard.classList.remove("hidden");

        saveHistory(user.login);


    } catch (err) {

        showError(
            err.message || "Something went wrong. Please try again."
        );

    } finally {

        setLoading(false);

    }

}


// LOADING STATE

function setLoading(isLoading) {

    loading.classList.toggle("hidden", !isLoading);

    searchBtn.disabled = isLoading;

    searchBtn.textContent = isLoading
        ? "Searching..."
        : "Search";

}


// DISPLAY PROFILE

function displayProfile(user) {

    const avatar = document.getElementById("avatar");

    avatar.src = user.avatar_url;

    avatar.alt = `${user.login}'s GitHub avatar`;


    document.getElementById("name").textContent =
        user.name || user.login;

    document.getElementById("username").textContent =
        `@${user.login}`;

    document.getElementById("bio").textContent =
        user.bio || "No bio available.";


    const link = document.getElementById("githubLink");

    link.href = user.html_url;


    // PROFILE METADATA

    const meta = document.getElementById("profileMeta");

    meta.innerHTML = "";


    const details = [

        user.location && [
            "fa-location-dot",
            user.location
        ],

        user.company && [
            "fa-building",
            user.company
        ],

        user.blog && [
            "fa-link",
            user.blog
        ],

        user.created_at && [
            "fa-calendar",
            `Joined ${new Date(user.created_at).toLocaleDateString(
                undefined,
                {
                    month: "short",
                    year: "numeric"
                }
            )}`
        ]

    ].filter(Boolean);


    details.forEach(([icon, value]) => {

        const item = document.createElement("span");

        item.innerHTML = `<i class="fa-solid ${icon}"></i>`;


        const text = document.createElement("span");

        text.textContent = value;

        item.appendChild(text);


        // BLOG LINK

        if (icon === "fa-link") {

            const anchor = document.createElement("a");

            anchor.href = value.startsWith("http")
                ? value
                : `https://${value}`;

            anchor.target = "_blank";

            anchor.rel = "noopener noreferrer";

            anchor.textContent = value;

            item.replaceChild(anchor, text);

        }


        meta.appendChild(item);

    });

}


// DISPLAY STATISTICS

function displayStats(user, repos) {

    document.getElementById("repos").textContent =
        Number(user.public_repos || 0).toLocaleString();


    document.getElementById("followers").textContent =
        Number(user.followers || 0).toLocaleString();


    document.getElementById("following").textContent =
        Number(user.following || 0).toLocaleString();


    const stars = repos.reduce(
        (sum, repo) => sum + repo.stargazers_count,
        0
    );

    document.getElementById("stars").textContent =
        stars.toLocaleString();

}


// LANGUAGE FILTER

function populateLanguageFilter(repos) {

    const select = document.getElementById("languageFilter");

    const selected = select.value;


    const languages = [
        ...new Set(
            repos.map(repo => repo.language).filter(Boolean)
        )
    ].sort();


    select.innerHTML =
        '<option value="all">All languages</option>';


    languages.forEach(language => {

        const option = document.createElement("option");

        option.value = language;

        option.textContent = language;

        select.appendChild(option);

    });


    select.value = languages.includes(selected)
        ? selected
        : "all";

}


// REPOSITORY EXPLORER

function renderRepositories() {

    const container = document.getElementById("repoList");

    const query = document
        .getElementById("repoSearch")
        .value
        .trim()
        .toLowerCase();


    const language =
        document.getElementById("languageFilter").value;


    const sort =
        document.getElementById("sortRepos").value;


    // FILTER REPOSITORIES

    let filtered = allRepos.filter(repo => {

        const matchesQuery =
            repo.name.toLowerCase().includes(query) ||
            (repo.description || "").toLowerCase().includes(query);


        const matchesLanguage =
            language === "all" || repo.language === language;


        return matchesQuery && matchesLanguage;

    });


    // SORT REPOSITORIES

    filtered.sort((a, b) => {

        if (sort === "stars") {

            return b.stargazers_count - a.stargazers_count;

        }

        if (sort === "forks") {

            return b.forks_count - a.forks_count;

        }

        if (sort === "name") {

            return a.name.localeCompare(b.name);

        }

        return new Date(b.updated_at) - new Date(a.updated_at);

    });


    // UPDATE RESULT COUNT

    document.getElementById("repoCount").textContent =
        `${filtered.length} of ${allRepos.length} repositories`;


    document.getElementById("repoEmpty")
        .classList.toggle("hidden", filtered.length !== 0);


    container.innerHTML = "";


    // CREATE REPOSITORY CARDS

    filtered.forEach(repo => {

        const card = document.createElement("article");

        card.className = "repo-card";


        // REPOSITORY NAME

        const title = document.createElement("h3");

        const anchor = document.createElement("a");

        anchor.href = repo.html_url;

        anchor.target = "_blank";

        anchor.rel = "noopener noreferrer";

        anchor.textContent = repo.name;

        title.appendChild(anchor);


        // DESCRIPTION

        const description = document.createElement("p");

        description.textContent =
            repo.description || "No description available.";


        // REPOSITORY INFORMATION

        const info = document.createElement("div");

        info.className = "repo-info";


        info.append(

            makeRepoInfo(
                "fa-star",
                repo.stargazers_count,
                "stars"
            ),

            makeRepoInfo(
                "fa-code-fork",
                repo.forks_count,
                "forks"
            ),

            makeRepoInfo(
                "fa-code",
                repo.language || "Not specified"
            )

        );


        // LAST UPDATED

        const updated = document.createElement("small");

        updated.className = "repo-updated";

        updated.textContent =
            `Updated ${new Date(repo.updated_at).toLocaleDateString()}`;


        card.append(
            title,
            description,
            info,
            updated
        );

        container.appendChild(card);

    });

}


// REPOSITORY INFORMATION ELEMENT

function makeRepoInfo(icon, value, label = "") {

    const span = document.createElement("span");

    const i = document.createElement("i");

    i.className = `fa-solid ${icon}`;

    span.appendChild(i);

    span.appendChild(
        document.createTextNode(
            ` ${value}${label ? " " + label : ""}`
        )
    );

    return span;

}


// LANGUAGE ANALYTICS

function renderLanguageAnalytics(repos) {

    const counts = {};


    // COUNT LANGUAGES

    repos.forEach(repo => {

        if (repo.language) {

            counts[repo.language] =
                (counts[repo.language] || 0) + 1;

        }

    });


    const entries = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]);


    const total = entries.reduce(
        (sum, [, count]) => sum + count,
        0
    );


    document.getElementById("languageTotal").textContent = total;


    const chart = document.getElementById("languageChart");

    const legend = document.getElementById("languageLegend");


    // NO LANGUAGE DATA

    if (!total) {

        chart.style.background = "#e5e7eb";

        legend.innerHTML =
            '<p class="muted">No language data available for this profile.</p>';

        return;

    }


    // CREATE DONUT CHART

    let current = 0;


    const segments = entries.map(([name, count], index) => {

        const start = current;

        current += count / total * 100;

        return `${COLORS[index % COLORS.length]} ${start}% ${current}%`;

    });


    chart.style.background =
        `conic-gradient(${segments.join(", ")})`;


    // CREATE LEGEND

    legend.innerHTML = "";


    entries.forEach(([name, count], index) => {

        const row = document.createElement("div");

        row.className = "legend-row";


        const dot = document.createElement("span");

        dot.className = "legend-dot";

        dot.style.background = COLORS[index % COLORS.length];


        const label = document.createElement("span");

        label.textContent = name;


        const percentage = document.createElement("strong");

        percentage.textContent =
            `${Math.round(count / total * 100)}% (${count})`;


        row.append(
            dot,
            label,
            percentage
        );

        legend.appendChild(row);

    });

}


// ERROR HANDLING

function showError(message) {

    error.textContent = message;

    error.classList.remove("hidden");

    dashboard.classList.add("hidden");

    welcome.classList.add("hidden");

}


// INITIALIZE

renderHistory();