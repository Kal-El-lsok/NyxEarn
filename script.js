// ============================================
// NYXEARN - COMPLETE WITH ALL 3 AD TYPES
// Interstitial: int-29836 | Reward: reward-29841 | Task: task-29840
// ============================================

// ADMIN CONFIGURATION
const ADMIN_BOT_TOKEN = '8527566790:AAFCvWQpfYABM8p4xL-p3t9_akX-W2DqeiM';
const ADMIN_CHAT_ID = '8527566790';

// ADSGRAM BLOCK IDS
const INTERSTITIAL_BLOCK_ID = 'int-29836';
const REWARD_BLOCK_ID = 'reward-29841';
const TASK_BLOCK_ID = 'task-29840';

// ECONOMY SETTINGS
const NYX_TO_USD = 200;
const MIN_WITHDRAW = 2000;

// TASKS DATA
const TASKS = [
    { id: 1, name: "📱 Download App", time: "3 min", reward: 80, icon: "📱" },
    { id: 2, name: "📝 Complete Survey", time: "5 min", reward: 50, icon: "📝" },
    { id: 3, name: "🔗 Sign Up", time: "1 min", reward: 30, icon: "🔗" },
    { id: 4, name: "🎮 Try Game", time: "4 min", reward: 60, icon: "🎮" },
    { id: 5, name: "📺 Watch Review", time: "2 min", reward: 40, icon: "📺" }
];

// USER DATA
let userData = {
    userId: null,
    username: "User",
    coins: 0,
    totalEarned: 0,
    dailyEarned: 0,
    dailyWatched: 0,
    streakDays: 0,
    lastCheckin: null,
    lastDailyReset: null,
    level: 1,
    xp: 0,
    referrals: 0,
    totalReferralCoins: 0,
    transactionHistory: [],
    achievements: {
        first_earn: false, streak_7: false, streak_30: false,
        referral_5: false, earn_5000: false, watch_100: false
    }
};

let tg = null;
let balanceVisible = true;

// ========== HELPER FUNCTIONS ==========
function formatCoins(n) { return n.toLocaleString(); }
function nyxToUsd(nyx) { return (nyx / NYX_TO_USD).toFixed(2); }

function showToast(msg, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showLoading(show) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.toggle("hidden", !show);
}

function sendToAdminBot(message) {
    fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message })
    }).catch(e => console.log(e));
}

// ========== COIN MANAGEMENT ==========
function addCoins(amount, source) {
    userData.coins += amount;
    userData.totalEarned += amount;
    userData.dailyEarned += amount;
    userData.xp += amount;
    
    // Level up
    while (userData.xp >= userData.level * 1000) {
        userData.xp -= userData.level * 1000;
        userData.level++;
        addCoins(60, "level_up");
        showToast(`🎉 Level Up! Level ${userData.level}! +60 NYX`, "success");
    }
    
    // Transaction history
    userData.transactionHistory.unshift({
        date: new Date().toLocaleString(),
        amount: amount,
        type: "earn",
        source: source
    });
    if (userData.transactionHistory.length > 100) userData.transactionHistory.pop();
    
    checkAchievements();
    saveData();
    updateUI();
    showToast(`+${amount} NYX ($${nyxToUsd(amount)}) from ${source}!`, "success");
}

function subtractCoins(amount) {
    if (userData.coins >= amount) {
        userData.coins -= amount;
        saveData();
        updateUI();
        return true;
    }
    return false;
}

// ========== ACHIEVEMENTS ==========
function checkAchievements() {
    if (!userData.achievements.first_earn && userData.totalEarned >= 200) {
        userData.achievements.first_earn = true;
        addCoins(30, "achievement");
        showToast("🏅 Achievement: First Steps! +30 NYX", "success");
    }
    if (!userData.achievements.streak_7 && userData.streakDays >= 7) {
        userData.achievements.streak_7 = true;
        addCoins(60, "achievement");
        showToast("🏅 Achievement: Weekly Warrior! +60 NYX", "success");
    }
    if (!userData.achievements.streak_30 && userData.streakDays >= 30) {
        userData.achievements.streak_30 = true;
        addCoins(150, "achievement");
        showToast("🏅 Achievement: Monthly Master! +150 NYX", "success");
    }
    if (!userData.achievements.referral_5 && userData.referrals >= 5) {
        userData.achievements.referral_5 = true;
        addCoins(60, "achievement");
        showToast("🏅 Achievement: Influencer! +60 NYX", "success");
    }
    if (!userData.achievements.earn_5000 && userData.totalEarned >= 10000) {
        userData.achievements.earn_5000 = true;
        addCoins(150, "achievement");
        showToast("🏅 Achievement: High Roller! +150 NYX", "success");
    }
    if (!userData.achievements.watch_100 && userData.dailyWatched >= 100) {
        userData.achievements.watch_100 = true;
        addCoins(60, "achievement");
        showToast("🏅 Achievement: Ad Expert! +60 NYX", "success");
    }
}

// ========== ADS FUNCTIONS ==========
// REWARDED VIDEO AD (when user clicks Watch Ad)
function showRewardedAd() {
    if (typeof window.Adsgram === 'undefined') {
        showToast("Ad service loading. Try again.", "warning");
        return;
    }
    
    showLoading(true);
    
    try {
        const adController = window.Adsgram.init({ blockId: REWARD_BLOCK_ID });
        
        adController.show().then(() => {
            showLoading(false);
            userData.dailyWatched++;
            addCoins(8, 'rewarded_ad');
            updateUI();
            showToast("🎬 +8 NYX for watching!", "success");
        }).catch((error) => {
            showLoading(false);
            console.error("Rewarded ad error:", error);
            showToast("Ad not ready. Try again!", "warning");
        });
    } catch(e) {
        showLoading(false);
        showToast("Ad error. Try again!", "warning");
    }
}

// INTERSTITIAL AD (full screen)
function showInterstitialAd() {
    if (typeof window.Adsgram === 'undefined') {
        showToast("Ad service loading. Try again.", "warning");
        return;
    }
    
    showLoading(true);
    
    try {
        const adController = window.Adsgram.init({ blockId: INTERSTITIAL_BLOCK_ID });
        
        adController.show().then(() => {
            showLoading(false);
            addCoins(5, 'interstitial_ad');
            showToast("📺 +5 NYX for watching!", "success");
        }).catch((error) => {
            showLoading(false);
            console.error("Interstitial ad error:", error);
            showToast("Ad not ready. Try again!", "warning");
        });
    } catch(e) {
        showLoading(false);
        showToast("Ad error. Try again!", "warning");
    }
}

// Make ad functions global for onclick
window.showRewardedAd = showRewardedAd;
window.showInterstitialAd = showInterstitialAd;

// ========== TASK FUNCTIONS ==========
function initTaskBlock() {
    const taskElement = document.getElementById('adsgram-task-block');
    if (!taskElement) return;
    
    taskElement.addEventListener('reward', (event) => {
        console.log('Task completed!', event.detail);
        addCoins(50, 'task_completed');
        showToast("🎉 Task Completed! +50 NYX", "success");
        updateUI();
    });
    
    taskElement.addEventListener('onError', () => {
        console.log("Task error");
    });
    
    taskElement.addEventListener('onBannerNotFound', () => {
        console.log("No tasks available");
    });
}

// ========== DAILY CHECK-IN ==========
function dailyCheckin() {
    const today = new Date().toDateString();
    if (userData.lastCheckin === today) {
        showToast("Already checked in today!", "warning");
        return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (userData.lastCheckin === yesterday.toDateString()) {
        userData.streakDays++;
    } else {
        userData.streakDays = 1;
    }
    
    let reward = 60;
    if (userData.streakDays >= 30) reward += 300;
    else if (userData.streakDays >= 7) reward += 60;
    
    userData.lastCheckin = today;
    addCoins(reward, "daily_checkin");
    showToast(`✅ Daily check-in! +${reward} NYX ($${nyxToUsd(reward)}) - ${userData.streakDays} day streak!`, "success");
}

// ========== DAILY RESET ==========
function checkDailyReset() {
    const today = new Date().toDateString();
    if (userData.lastDailyReset !== today) {
        if (userData.dailyEarned < 50 && userData.streakDays > 0) {
            showToast(`⚠️ Your ${userData.streakDays} day streak ended. Start fresh today!`, "warning");
            userData.streakDays = 0;
        }
        userData.dailyEarned = 0;
        userData.dailyWatched = 0;
        userData.lastDailyReset = today;
        saveData();
        updateUI();
    }
}

// ========== TASKS (Manual) ==========
function startTask(reward, taskName) {
    showLoading(true);
    setTimeout(() => {
        showLoading(false);
        addCoins(reward, taskName);
    }, 1500);
}

// ========== WITHDRAWAL ==========
function requestWithdrawal(method, address) {
    if (userData.coins < MIN_WITHDRAW) {
        showToast(`Need ${MIN_WITHDRAW - userData.coins} more NYX to withdraw`, "error");
        return false;
    }
    if (!address) {
        showToast("Enter wallet address", "error");
        return false;
    }
    
    const usdValue = (userData.coins / NYX_TO_USD).toFixed(2);
    sendToAdminBot(`🌙 WITHDRAWAL REQUEST\nUser: ${userData.username}\nID: ${userData.userId}\nAmount: ${userData.coins} NYX ($${usdValue})\nMethod: ${method}\nAddress: ${address}\nTime: ${new Date().toLocaleString()}`);
    
    userData.transactionHistory.unshift({
        date: new Date().toLocaleString(),
        amount: -userData.coins,
        type: "withdraw",
        source: "withdrawal"
    });
    userData.coins = 0;
    saveData();
    updateUI();
    document.getElementById("withdrawModal").classList.remove("active");
    showToast(`✅ Withdrawal request for $${usdValue} sent! Processed within 24-48 hours.`, "success");
    return true;
}

// ========== RENDER FUNCTIONS ==========
function renderTasks(containerId, limit = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let tasks = TASKS;
    if (limit) tasks = tasks.slice(0, limit);
    container.innerHTML = tasks.map(t => `
        <div class="task-item" onclick="startTask(${t.reward}, '${t.name}')">
            <div class="task-icon">${t.icon}</div>
            <div class="task-info"><div class="task-name">${t.name}</div><div class="task-time">⏱️ ${t.time}</div></div>
            <div class="task-reward"><div class="task-nyx">+${t.reward} NYX</div><div class="task-usd">$${nyxToUsd(t.reward)}</div></div>
        </div>
    `).join("");
}

function renderLeaderboard() {
    const leaderboardUsers = [
        { name: "CryptoKing", score: 28450 },
        { name: "MoonHunter", score: 23120 },
        { name: userData.username, score: userData.totalEarned, isUser: true },
        { name: "StarGazer", score: 19870 },
        { name: "NightOwl", score: 15430 }
    ];
    leaderboardUsers.sort((a,b) => b.score - a.score);
    
    const listContainer = document.getElementById("leaderboardList");
    if (listContainer) {
        listContainer.innerHTML = leaderboardUsers.map((u, i) => `
            <div class="leaderboard-item" style="${u.isUser ? 'border:1px solid #2B5BFF' : ''}">
                <div class="leaderboard-rank ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''}">#${i+1}</div>
                <div class="leaderboard-name">${u.name} ${u.isUser ? '(You)' : ''}</div>
                <div class="task-nyx">${u.score.toLocaleString()} NYX</div>
            </div>
        `).join("");
        
        const userRank = leaderboardUsers.findIndex(u => u.isUser) + 1;
        document.getElementById("statRank").innerText = userRank ? `#${userRank}` : "#--";
    }
    
    const previewContainer = document.getElementById("leaderboardPreview");
    if (previewContainer) {
        previewContainer.innerHTML = leaderboardUsers.slice(0,3).map((u,i) => `
            <div class="task-item"><div class="task-icon">${i===0?'🥇':i===1?'🥈':'🥉'}</div><div class="task-info"><div class="task-name">${u.name}</div></div><div class="task-nyx">${u.score.toLocaleString()} NYX</div></div>
        `).join("");
    }
}

function renderHistory(filterType = "all") {
    const container = document.getElementById("historyList");
    if (!container) return;
    
    let filtered = [...userData.transactionHistory];
    if (filterType === "earn") filtered = filtered.filter(t => t.amount > 0);
    if (filterType === "withdraw") filtered = filtered.filter(t => t.amount < 0);
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="task-item">No transactions yet</div>';
        return;
    }
    
    container.innerHTML = filtered.slice(0,30).map(t => `
        <div class="history-item">
            <div class="history-amount ${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : ''}${Math.abs(t.amount)} NYX</div>
            <div style="flex:1"><div>${t.source || t.type}</div><div style="font-size:10px; color:#8E9AB0">${t.date}</div></div>
            <div>${t.amount > 0 ? '+' : ''}$${Math.abs(t.amount / NYX_TO_USD).toFixed(2)}</div>
        </div>
    `).join("");
}

function renderAchievements() {
    const achievementsList = [
        { id: "first_earn", name: "First Steps", icon: "🎯", desc: "Earn 200 NYX" },
        { id: "streak_7", name: "Weekly Warrior", icon: "🔥", desc: "7 day streak" },
        { id: "streak_30", name: "Monthly Master", icon: "🏆", desc: "30 day streak" },
        { id: "referral_5", name: "Influencer", icon: "👥", desc: "5 referrals" },
        { id: "earn_5000", name: "High Roller", icon: "💎", desc: "Earn 10,000 NYX" },
        { id: "watch_100", name: "Ad Expert", icon: "🎬", desc: "Watch 100 ads" }
    ];
    
    const container = document.getElementById("achievementsGrid");
    if (!container) return;
    
    container.innerHTML = achievementsList.map(a => `
        <div class="achievement ${userData.achievements[a.id] ? 'unlocked' : ''}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.desc}</div>
        </div>
    `).join("");
}

// ========== UI UPDATE ==========
function updateUI() {
    // Balance
    document.getElementById("balanceAmount").innerText = balanceVisible ? formatCoins(userData.coins) : "••••••";
    document.getElementById("usdValue").innerText = balanceVisible ? nyxToUsd(userData.coins) : "••••••";
    document.getElementById("todayEarned").innerText = userData.dailyEarned;
    document.getElementById("streakDays").innerText = userData.streakDays;
    document.getElementById("userLevel").innerText = userData.level;
    document.getElementById("sidebarLevel").innerText = userData.level;
    document.getElementById("sidebarName").innerText = userData.username;
    document.getElementById("profileName").innerText = userData.username;
    document.getElementById("profileUserId").innerHTML = `ID: ${userData.userId || "Guest"}`;
    document.getElementById("profileLevel").innerText = userData.level;
    document.getElementById("statTotalEarned").innerText = formatCoins(userData.totalEarned);
    document.getElementById("statReferrals").innerText = userData.referrals;
    document.getElementById("refTotal").innerText = userData.referrals;
    document.getElementById("refEarned").innerText = userData.totalReferralCoins;
    document.getElementById("modalBalance").innerText = formatCoins(userData.coins);
    document.getElementById("watchCount").innerText = userData.dailyWatched;
    document.getElementById("watchEarned").innerText = userData.dailyEarned;
    document.getElementById("statJoinDate").innerText = new Date().toLocaleDateString();
    
    // Progress
    const xpNeeded = userData.level * 1000;
    document.getElementById("levelProgressFill").style.width = `${(userData.xp / xpNeeded) * 100}%`;
    document.getElementById("nextLevelXp").innerText = `${userData.xp} / ${xpNeeded} XP to Level ${userData.level + 1}`;
    document.getElementById("dailyProgressFill").style.width = `${Math.min((userData.dailyEarned / 1000) * 100, 100)}%`;
    document.getElementById("dailyGoalText").innerHTML = `${userData.dailyEarned} / 1000 NYX`;
    document.getElementById("withdrawProgressFill").style.width = `${Math.min((userData.coins / MIN_WITHDRAW) * 100, 100)}%`;
    
    // Check-in reward preview
    let checkinReward = 60;
    if (userData.streakDays >= 30) checkinReward += 300;
    else if (userData.streakDays >= 7) checkinReward += 60;
    document.getElementById("checkinReward").innerHTML = `+${checkinReward}`;
    
    // Referral link
    const referralLink = document.getElementById("referralLink");
    if (referralLink) {
        referralLink.value = `https://t.me/NyxEarnBot?start=ref_${userData.userId || "guest"}`;
    }
    
    renderLeaderboard();
    renderAchievements();
}

// ========== NAVIGATION ==========
function navigateTo(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const targetPage = document.getElementById(`${page}Page`);
    if (targetPage) targetPage.classList.add("active");
    
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) activeNav.classList.add("active");
    
    document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
    const activeSidebar = document.querySelector(`.sidebar-item[data-page="${page}"]`);
    if (activeSidebar) activeSidebar.classList.add("active");
    
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("active");
    
    if (page === "tasks") renderTasks("allTasksList");
    if (page === "home") renderTasks("tasksPreview", 2);
    if (page === "history") {
        const activeFilter = document.querySelector(".history-filter.active")?.getAttribute("data-filter") || "all";
        renderHistory(activeFilter);
    }
    updateUI();
}

// ========== DATA PERSISTENCE ==========
function saveData() {
    const data = {
        userId: userData.userId, username: userData.username, coins: userData.coins,
        totalEarned: userData.totalEarned, dailyEarned: userData.dailyEarned,
        dailyWatched: userData.dailyWatched, streakDays: userData.streakDays,
        lastCheckin: userData.lastCheckin, lastDailyReset: userData.lastDailyReset,
        level: userData.level, xp: userData.xp, referrals: userData.referrals,
        totalReferralCoins: userData.totalReferralCoins, transactionHistory: userData.transactionHistory,
        achievements: userData.achievements
    };
    if (tg && tg.CloudStorage) tg.CloudStorage.setItem("nyxearn_data", JSON.stringify(data));
    else localStorage.setItem("nyxearn_data", JSON.stringify(data));
}

function loadData() {
    return new Promise((resolve) => {
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.getItem("nyxearn_data", (err, val) => {
                if (val && !err) {
                    try { Object.assign(userData, JSON.parse(val)); } catch(e) {}
                }
                resolve();
            });
        } else {
            const saved = localStorage.getItem("nyxearn_data");
            if (saved) {
                try { Object.assign(userData, JSON.parse(saved)); } catch(e) {}
            }
            resolve();
        }
    });
}

// ========== INITIALIZATION ==========
async function init() {
    if (window.TelegramWebApp) {
        tg = window.TelegramWebApp;
        tg.ready();
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user) {
            userData.userId = user.id;
            userData.username = user.first_name || user.username || "User";
        }
    }
    
    await loadData();
    checkDailyReset();
    renderTasks("tasksPreview", 2);
    renderTasks("allTasksList");
    updateUI();
    initTaskBlock();
    
    // Event Listeners
    document.getElementById("menuBtn")?.addEventListener("click", () => {
        document.getElementById("sidebar").classList.add("open");
        document.getElementById("sidebarOverlay").classList.add("active");
    });
    
    document.getElementById("sidebarOverlay")?.addEventListener("click", () => {
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("sidebarOverlay").classList.remove("active");
    });
    
    document.querySelectorAll(".sidebar-item, .nav-item").forEach(el => {
        el.addEventListener("click", () => {
            const page = el.getAttribute("data-page");
            if (page && page !== "more") navigateTo(page);
        });
    });
    
    document.getElementById("moreBtn")?.addEventListener("click", () => {
        document.getElementById("sidebar").classList.add("open");
        document.getElementById("sidebarOverlay").classList.add("active");
    });
    
    document.querySelectorAll(".action-card").forEach(el => {
        el.addEventListener("click", () => {
            const action = el.getAttribute("data-action");
            if (action === "tasks") navigateTo("tasks");
            else if (action === "watch") navigateTo("watch");
            else if (action === "checkin") dailyCheckin();
            else if (action === "withdraw") document.getElementById("withdrawModal").classList.add("active");
        });
    });
    
    document.querySelectorAll(".back-btn, .view-all").forEach(el => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            const page = el.getAttribute("data-page");
            if (page) navigateTo(page);
        });
    });
    
    // Ad buttons
    document.getElementById("watchRewardBtn")?.addEventListener("click", showRewardedAd);
    document.getElementById("watchInterstitialBtn")?.addEventListener("click", showInterstitialAd);
    
    // Modal
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", () => document.getElementById("withdrawModal").classList.remove("active"));
    });
    
    document.getElementById("submitWithdrawalBtn")?.addEventListener("click", () => {
        const method = document.getElementById("withdrawMethod").value;
        const address = document.getElementById("withdrawAddress").value;
        requestWithdrawal(method, address);
        document.getElementById("withdrawAddress").value = "";
    });
    
    // Referral
    document.getElementById("copyReferralLink")?.addEventListener("click", () => {
        const input = document.getElementById("referralLink");
        if (input) { input.select(); document.execCommand("copy"); showToast("Referral link copied!", "success"); }
    });
    
    // Support
    document.getElementById("supportChatBtn")?.addEventListener("click", () => {
        const msg = prompt("Type your message:");
        if (msg) sendToAdminBot(`💬 Support from ${userData.username} (${userData.userId}):\n${msg}`);
    });
    
    document.getElementById("supportFaqBtn")?.addEventListener("click", () => {
        const faq = document.getElementById("faqSection");
        faq.style.display = faq.style.display === "none" ? "block" : "none";
    });
    
    document.getElementById("sendSupportMsg")?.addEventListener("click", () => {
        const msg = document.getElementById("supportMessage")?.value;
        if (msg) {
            sendToAdminBot(`💬 Support message from ${userData.username} (${userData.userId}):\n${msg}`);
            document.getElementById("supportMessage").value = "";
            showToast("Message sent to support!", "success");
        }
    });
    
    document.getElementById("withdrawSettingsBtn")?.addEventListener("click", () => {
        document.getElementById("withdrawModal").classList.add("active");
    });
    
    document.getElementById("toggleBalance")?.addEventListener("click", () => {
        balanceVisible = !balanceVisible;
        updateUI();
    });
    
    // FAB
    document.getElementById("fabBtn")?.addEventListener("click", () => {
        document.getElementById("fabMenu").classList.toggle("active");
    });
    
    document.querySelectorAll(".fab-option").forEach(opt => {
        opt.addEventListener("click", () => {
            const action = opt.getAttribute("data-action");
            if (action === "tasks") navigateTo("tasks");
            else if (action === "watch") navigateTo("watch");
            else if (action === "checkin") dailyCheckin();
            document.getElementById("fabMenu").classList.remove("active");
        });
    });
    
    // History filters
    document.querySelectorAll(".history-filter").forEach(filter => {
        filter.addEventListener("click", () => {
            document.querySelectorAll(".history-filter").forEach(f => f.classList.remove("active"));
            filter.classList.add("active");
            const filterType = filter.getAttribute("data-filter");
            renderHistory(filterType);
        });
    });
    
    // Notification toggle
    document.getElementById("notificationToggle")?.addEventListener("change", (e) => {
        showToast(`Notifications ${e.target.checked ? "on" : "off"}`, "info");
    });
}

// Start the app
init();
