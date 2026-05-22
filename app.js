// ============================================
// PRODE MUNDIAL 2026 - APP LOGIC
// ============================================

const App = (() => {
    'use strict';

    let currentView = 'predictions';
    let currentUser = null;

    // --- DOM Refs ---
    const $ = id => document.getElementById(id);
    const fixtureMain = $('fixtureMain');

    // --- Init ---
    function init() {
        createParticles();
        startCountdown();
        populateVenueFilter();
        bindEvents();

        // Show loading indicator initially
        const authArea = $('authArea');
        if (authArea) {
            authArea.innerHTML = `<div class="auth-loading"><div class="spinner"></div></div>`;
        }

        // Check for redirect errors from Supabase Auth in query or hash
        const urlParams = new URLSearchParams(window.location.search);
        let errorMsg = urlParams.get('error_description') || urlParams.get('error');
        
        if (!errorMsg && window.location.hash.startsWith('#error=')) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            errorMsg = hashParams.get('error_description') || hashParams.get('error');
        }

        if (errorMsg) {
            showNotification(`❌ Error: ${decodeURIComponent(errorMsg).replace(/\+/g, ' ')}`, 'error');
            history.replaceState(null, '', window.location.pathname);
        }

        Store.onAuthChanged((user) => {
            if (user) {
                setLoggedIn(user);
            } else {
                showLoginForm();
            }
            renderView(currentView);
            checkShareUrl();
        });
    }

    // --- Auth ---
    async function doGoogleLogin() {
        try {
            await Store.signInWithGoogle();
        } catch (error) {
            console.error('Google login failed:', error);
            showNotification('Error al iniciar sesión con Google', 'error');
        }
    }

    function setLoggedIn(user) {
        currentUser = user;
        const authArea = $('authArea');
        const scoreBar = $('scoreBar');
        
        const avatarHtml = user.photoURL 
            ? `<img src="${user.photoURL}" class="user-avatar" alt="${user.displayName}" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="user-avatar-placeholder" style="display:none;">${(user.displayName || 'U')[0].toUpperCase()}</div>`
            : `<div class="user-avatar-placeholder">${(user.displayName || 'U')[0].toUpperCase()}</div>`;

        authArea.innerHTML = `
            <div class="user-logged">
                ${avatarHtml}
                <span class="user-name">${user.displayName}</span>
                <button class="btn-logout" onclick="App.logout()">Salir</button>
            </div>`;
        scoreBar.style.display = '';
        updateScoreBar();
    }

    function showLoginForm() {
        currentUser = null;
        const authArea = $('authArea');
        const scoreBar = $('scoreBar');
        authArea.innerHTML = `
            <div class="login-inline">
                <button class="btn-login-google" onclick="App.doGoogleLogin()">
                    <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" style="margin-right: 8px;">
                        <path fill="#EA4335" d="M12 5.04c1.78 0 3.37.61 4.62 1.8l3.47-3.47C17.99 1.24 15.22.4 12 .4 7.42.4 3.51 3.03 1.63 6.87l3.99 3.1A6.97 6.97 0 0 1 12 5.04z"/>
                        <path fill="#4285F4" d="M23.49 12.27c0-.86-.08-1.68-.22-2.47H12v4.67h6.44c-.28 1.47-1.11 2.71-2.36 3.56l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.6z"/>
                        <path fill="#FBBC05" d="M5.62 14.53a6.99 6.99 0 0 1 0-4.14l-3.99-3.1A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.37l4.37-3.84z"/>
                        <path fill="#34A853" d="M12 23.6c3.24 0 5.96-1.07 7.95-2.91l-3.66-2.84a7.22 7.22 0 0 1-4.29 1.19c-3.55 0-6.56-2.4-7.63-5.63l-4.37 3.84a11.96 11.96 0 0 0 12 9.6z"/>
                    </svg>
                    <span>Ingresar con Google</span>
                </button>
            </div>`;
        scoreBar.style.display = 'none';
    }

    async function logout() {
        await Store.signOut();
        showLoginForm();
        renderView(currentView);
    }

    function updateScoreBar() {
        if (!currentUser) return;
        const s = Store.getTotalScore(currentUser.uid);
        $('scoreTotal').textContent = s.total;
        $('scoreExact').textContent = s.exact;
        $('scoreResult').textContent = s.result;
        $('scoreWrong').textContent = s.wrong;
    }

    // --- Navigation ---
    function bindEvents() {
        $('mainNav').addEventListener('click', e => {
            if (e.target.classList.contains('main-nav-tab')) {
                $('mainNav').querySelectorAll('.main-nav-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentView = e.target.dataset.view;
                renderView(currentView);
            }
        });
        $('filterGroup').addEventListener('change', () => renderView(currentView));
        $('filterVenue').addEventListener('change', () => renderView(currentView));
        let debounce;
        $('filterTeam').addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(() => renderView(currentView), 250);
        });
    }

    function renderView(view) {
        fixtureMain.innerHTML = '';
        const filtersEl = $('filtersSection');
        const infoBar = $('infoBar');
        filtersEl.style.display = (view === 'predictions' || view === 'official') ? '' : 'none';
        infoBar.style.display = (view === 'predictions' || view === 'official') ? '' : 'none';

        if (view === 'ranking' || view === 'prize') {
            Store.refreshCompetitorsData().then(() => {
                if (currentView === view) {
                    if (view === 'ranking') renderRanking();
                    else if (view === 'prize') renderPrize();
                }
            }).catch(console.error);
        }

        switch (view) {
            case 'predictions': renderFixture(true); break;
            case 'official': renderFixture(false); break;
            case 'tables': renderTables(); break;
            case 'bracket': renderBracket(); break;
            case 'prize': renderPrize(); break;
            case 'ranking': renderRanking(); break;
        }
    }

    // --- Fixture Render ---
    function renderFixture(editable) {
        const groupVal = $('filterGroup').value;
        const venueVal = $('filterVenue').value;
        const teamVal = $('filterTeam').value.trim().toLowerCase();

        let filtered = GROUP_STAGE_MATCHES.filter(m => {
            if (groupVal !== 'all' && m.group !== groupVal) return false;
            if (venueVal !== 'all' && m.venue !== venueVal) return false;
            if (teamVal) {
                const h = TEAMS[m.home], a = TEAMS[m.away];
                if (!h.name.toLowerCase().includes(teamVal) && !a.name.toLowerCase().includes(teamVal) &&
                    !m.home.toLowerCase().includes(teamVal) && !m.away.toLowerCase().includes(teamVal)) return false;
            }
            return true;
        });

        if (!filtered.length) {
            fixtureMain.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><div class="no-results-text">No se encontraron partidos</div></div>`;
            return;
        }

        const predictions = currentUser ? Store.getPredictions(currentUser.uid) : {};
        const results = Store.getRealResults();

        const byDate = {};
        filtered.forEach(m => { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });

        Object.keys(byDate).sort().forEach((dateStr, idx) => {
            const matches = byDate[dateStr];
            const dayEl = document.createElement('div');
            dayEl.className = 'match-day';
            dayEl.style.animationDelay = (idx * 0.06) + 's';

            const dateObj = parseDate(dateStr);
            const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
            const dayNum = dateObj.getDate();
            const monthName = dateObj.toLocaleDateString('es-AR', { month: 'long' });

            // Group matchdays present on this date
            const matchdays = [...new Set(matches.map(m => m.matchday))].sort();
            const mdBadges = matchdays.map(md => `<span class="match-day-badge">Jornada ${md}</span>`).join('');

            dayEl.innerHTML = `
                <div class="match-day-header">
                    <div class="match-day-date">${capitalize(dayName)} ${dayNum} de ${capitalize(monthName)}</div>
                    ${mdBadges}
                    <span class="match-day-count">${matches.length} partido${matches.length > 1 ? 's' : ''}</span>
                </div>
                <div class="matches-grid">
                    ${matches.map(m => renderMatchCard(m, editable, predictions, results)).join('')}
                </div>`;
            fixtureMain.appendChild(dayEl);
        });
    }

    function renderMatchCard(match, editable, predictions, results) {
        const home = TEAMS[match.home], away = TEAMS[match.away], venue = VENUES[match.venue];
        const pred = predictions[match.id];
        const real = results[match.id];
        const started = Store.isMatchStarted(match);
        const locked = started && editable;
        const showInputs = editable && currentUser;

        let scoreHtml = '';
        let statusHtml = '';

        if (showInputs) {
            const hVal = pred ? pred.h : '';
            const aVal = pred ? pred.a : '';
            const disabled = locked ? 'disabled' : '';
            scoreHtml = `
                <div class="score-inputs ${locked ? 'locked' : ''}">
                    <input type="number" class="score-input" data-match="${match.id}" data-side="h"
                        value="${hVal}" min="0" max="20" ${disabled} placeholder="-" onchange="App.onScoreChange(this)">
                    <span class="score-dash">-</span>
                    <input type="number" class="score-input" data-match="${match.id}" data-side="a"
                        value="${aVal}" min="0" max="20" ${disabled} placeholder="-" onchange="App.onScoreChange(this)">
                </div>`;

            // Status indicator (✓/✗)
            if (real && pred) {
                const s = Store.scoreMatch(pred, real);
                if (s.status === 'exact') statusHtml = `<div class="pred-status exact" title="+2 pts – Resultado exacto">✓✓</div>`;
                else if (s.status === 'result') statusHtml = `<div class="pred-status correct" title="+1 pt – Acertó resultado">✓</div>`;
                else statusHtml = `<div class="pred-status wrong" title="0 pts – No acertó">✗</div>`;
            } else if (locked && !pred) {
                statusHtml = `<div class="pred-status missed" title="Sin predicción">—</div>`;
            }
        } else if (!editable && real) {
            scoreHtml = `<div class="real-score"><span>${real.h}</span><span class="score-dash">-</span><span>${real.a}</span></div>`;
        } else if (!editable) {
            scoreHtml = `<div class="score-inputs pending"><span class="score-dash">vs</span></div>`;
        }

        return `
            <div class="match-card ${locked ? 'card-locked' : ''}" id="match-${match.id}">
                <div class="match-time">
                    <span class="match-hour">${match.time}</span>
                    <span class="match-group-tag">Grupo ${match.group}</span>
                    <span class="match-md-tag">J${match.matchday}</span>
                </div>
                <div class="team home">
                    <span class="team-name">${home.name}</span>
                    <img class="team-flag" src="${getFlagUrl(home.code)}" alt="${home.name}" loading="lazy">
                </div>
                ${scoreHtml}
                <div class="team away">
                    <img class="team-flag" src="${getFlagUrl(away.code)}" alt="${away.name}" loading="lazy">
                    <span class="team-name">${away.name}</span>
                </div>
                <div class="match-venue">
                    ${statusHtml}
                    <span class="venue-icon">🏟️</span>
                    <span class="venue-name">${venue.city}</span>
                </div>
            </div>`;
    }

    // --- Score Input Handler ---
    function onScoreChange(input) {
        if (!currentUser) return;
        const matchId = input.dataset.match;
        const side = input.dataset.side;
        const card = input.closest('.match-card');
        const inputs = card.querySelectorAll('.score-input');
        const hInput = [...inputs].find(i => i.dataset.side === 'h');
        const aInput = [...inputs].find(i => i.dataset.side === 'a');
        const hVal = hInput.value, aVal = aInput.value;
        if (hVal !== '' && aVal !== '') {
            Store.savePrediction(matchId, hVal, aVal);
            updateScoreBar();
        }
    }

    // --- Tables ---
    function renderTables() {
        if (!currentUser) {
            fixtureMain.innerHTML = `<div class="no-results"><div class="no-results-icon">🔐</div><div class="no-results-text">Iniciá sesión para ver las tablas según tus predicciones</div></div>`;
            return;
        }

        const predictions = Store.getPredictions(currentUser.uid);
        const results = Store.getRealResults();

        let html = '<div class="tables-container">';
        Object.keys(GROUPS).sort().forEach(g => {
            const standingsPred = Store.calcGroupStandings(g, predictions);
            const standingsReal = Store.calcGroupStandings(g, results);
            const hasPred = standingsPred.some(s => s.pj > 0);
            const hasReal = standingsReal.some(s => s.pj > 0);

            html += `<div class="group-table-card">
                <div class="group-table-header">
                    <h3>Grupo ${g}</h3>
                    <div class="group-teams-flags">${GROUPS[g].map(t => `<img src="${getFlagUrl(TEAMS[t].code)}" class="mini-flag" title="${TEAMS[t].name}">`).join('')}</div>
                </div>`;

            if (hasPred) {
                html += renderStandingsTable(standingsPred, 'Mis Predicciones', true);
            }
            if (hasReal) {
                html += renderStandingsTable(standingsReal, 'Resultados Reales', false);
            }
            if (!hasPred && !hasReal) {
                html += `<p class="table-empty">Completá tus predicciones para ver la tabla</p>`;
            }
            html += '</div>';
        });
        html += '</div>';
        fixtureMain.innerHTML = html;
    }

    function renderStandingsTable(standings, label, isPred) {
        return `
            <div class="standings-label ${isPred ? 'pred' : 'real'}">${label}</div>
            <table class="standings-table">
                <thead><tr><th></th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
                <tbody>${standings.map((s, i) => {
                    const t = TEAMS[s.team];
                    const cls = i < 2 ? 'qualifies' : i === 2 ? 'maybe' : '';
                    return `<tr class="${cls}">
                        <td>${i + 1}</td>
                        <td class="team-cell"><img src="${getFlagUrl(t.code)}" class="mini-flag"> ${t.name}</td>
                        <td>${s.pj}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td>
                        <td>${s.gf}</td><td>${s.ga}</td><td class="${s.gd > 0 ? 'pos' : s.gd < 0 ? 'neg' : ''}">${s.gd > 0 ? '+' : ''}${s.gd}</td>
                        <td class="pts-cell">${s.pts}</td>
                    </tr>`;
                }).join('')}</tbody>
            </table>`;
    }

    // --- Ranking ---
    function renderRanking() {
        const users = Store.getLeaderboard();
        if (!users.length) {
            fixtureMain.innerHTML = `<div class="no-results"><div class="no-results-icon">🏆</div><div class="no-results-text">Aún no hay participantes</div></div>`;
            return;
        }
        let html = `<div class="ranking-container">
            <h2 class="ranking-title">🏆 Ranking del Prode</h2>
            <div class="ranking-list">`;
        users.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const isMe = currentUser && u.uid === currentUser.uid;
            html += `<div class="ranking-row ${isMe ? 'is-me' : ''}">
                <div class="rank-pos">${medal}</div>
                <div class="rank-user">
                    ${u.avatar ? `<img src="${u.avatar}" class="rank-avatar" referrerpolicy="no-referrer">` : `<div class="rank-avatar-ph">${(u.name||'?')[0].toUpperCase()}</div>`}
                    <span class="rank-name">${u.name}</span>
                </div>
                <div class="rank-stats">
                    <span class="rank-predictions">${u.predictions} pred.</span>
                    <span class="rank-total">${u.total} pts</span>
                </div>
            </div>`;
        });
        html += '</div></div>';
        fixtureMain.innerHTML = html;
    }

    // --- Bracket ---
    function renderBracket() {
        if (!currentUser) {
            fixtureMain.innerHTML = `<div class="no-results"><div class="no-results-icon">🔐</div><div class="no-results-text">Iniciá sesión para ver las llaves</div></div>`;
            return;
        }

        const predictions = Store.getPredictions(currentUser.uid);
        const totalGroupMatches = GROUP_STAGE_MATCHES.length;
        const predictedCount = GROUP_STAGE_MATCHES.filter(m => {
            const p = predictions[m.id];
            return p && p.h !== undefined && p.a !== undefined;
        }).length;

        if (predictedCount < totalGroupMatches) {
            const pct = Math.round((predictedCount / totalGroupMatches) * 100);
            fixtureMain.innerHTML = `
                <div class="bracket-incomplete">
                    <div class="no-results-icon">📋</div>
                    <div class="no-results-text">Completá la fase de grupos para generar las llaves</div>
                    <div class="bracket-progress">
                        <div class="bracket-progress-bar">
                            <div class="bracket-progress-fill" style="width: ${pct}%"></div>
                        </div>
                        <span class="bracket-progress-text">${predictedCount} / ${totalGroupMatches} predicciones (${pct}%)</span>
                    </div>
                </div>`;
            return;
        }

        const knockoutPreds = Store.getKnockoutPredictions(currentUser.uid);
        const bracketData = Store.resolveKnockoutBracket(predictions, knockoutPreds);

        if (!bracketData) {
            fixtureMain.innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><div class="no-results-text">Error al generar las llaves</div></div>`;
            return;
        }

        const rounds = ['r32', 'r16', 'qf', 'sf', 'final'];
        let html = '<div class="bracket-wrapper">';

        // Round tabs (mobile)
        html += '<div class="bracket-round-tabs" id="bracketTabs">';
        rounds.forEach((round, i) => {
            html += `<button class="bracket-tab ${i === 0 ? 'active' : ''}" data-round="${round}">${ROUND_LABELS[round]}</button>`;
        });
        html += '</div>';

        html += '<div class="bracket-container">';

        rounds.forEach((round, roundIdx) => {
            const matches = KNOCKOUT_BRACKET[round];
            html += `<div class="bracket-round ${roundIdx === 0 ? 'round-active' : ''}" data-round="${round}">`;
            html += `<div class="round-header"><span class="round-title">${ROUND_LABELS[round]}</span><span class="round-count">${matches.length} partido${matches.length > 1 ? 's' : ''}</span></div>`;
            html += '<div class="bracket-matches">';

            for (let i = 0; i < matches.length; i += 2) {
                if (i + 1 < matches.length) {
                    html += '<div class="bracket-pair">';
                    html += renderKnockoutCard(matches[i], bracketData, knockoutPreds);
                    html += renderKnockoutCard(matches[i + 1], bracketData, knockoutPreds);
                    html += '</div>';
                } else {
                    html += renderKnockoutCard(matches[i], bracketData, knockoutPreds);
                }
            }

            html += '</div></div>';
        });

        html += '</div>';

        // Champion display
        const finalResolved = bracketData.resolved['F-1'];
        const finalPred = knockoutPreds['F-1'];
        if (finalResolved && finalPred && finalPred.h !== undefined) {
            let championCode = null;
            if (finalPred.h > finalPred.a) championCode = finalResolved.home;
            else if (finalPred.a > finalPred.h) championCode = finalResolved.away;
            else if (finalPred.winner === 'home') championCode = finalResolved.home;
            else if (finalPred.winner === 'away') championCode = finalResolved.away;

            if (championCode && TEAMS[championCode]) {
                const champ = TEAMS[championCode];
                html += `<div class="champion-reveal">
                    <div class="champion-trophy">🏆</div>
                    <div class="champion-label">Tu Campeón del Mundo</div>
                    <div class="champion-team">
                        <img src="${getFlagUrl(champ.code)}" class="champion-flag" alt="${champ.name}">
                        <span class="champion-name">${champ.name}</span>
                    </div>
                </div>`;
            }
        }

        html += '</div>';
        fixtureMain.innerHTML = html;
        bindBracketTabs();
    }

    function renderKnockoutCard(match, bracketData, knockoutPreds) {
        const resolved = bracketData.resolved[match.id];
        const pred = knockoutPreds[match.id];
        const homeTeam = resolved?.home ? TEAMS[resolved.home] : null;
        const awayTeam = resolved?.away ? TEAMS[resolved.away] : null;

        let winner = null;
        if (pred && pred.h !== undefined && pred.a !== undefined) {
            if (pred.h > pred.a) winner = 'home';
            else if (pred.a > pred.h) winner = 'away';
            else winner = pred.winner || null;
        }

        const canPredict = homeTeam && awayTeam;
        const needsPenalty = pred && pred.h !== undefined && pred.a !== undefined && pred.h === pred.a;

        let html = `<div class="bracket-match ${winner ? 'has-winner' : ''}" id="ko-${match.id}">`;
        html += `<div class="bracket-match-id">${match.id}</div>`;

        // Home team
        html += `<div class="ko-team ${winner === 'home' ? 'advances' : ''} ${winner === 'away' ? 'eliminated' : ''}"><div class="ko-team-info">`;
        if (homeTeam) {
            html += `<img class="ko-flag" src="${getFlagUrl(homeTeam.code)}" alt="${homeTeam.name}" loading="lazy">`;
            html += `<span class="ko-name">${homeTeam.name}</span>`;
        } else {
            html += `<div class="ko-flag-placeholder"></div><span class="ko-placeholder">Por definir</span>`;
        }
        html += '</div>';
        if (canPredict) {
            const val = pred ? pred.h : '';
            html += `<input type="number" class="ko-score-input" data-match="${match.id}" data-side="h" value="${val}" min="0" max="20" placeholder="-" onchange="App.onKnockoutScoreChange(this)">`;
        }
        html += '</div>';

        // Away team
        html += `<div class="ko-team ${winner === 'away' ? 'advances' : ''} ${winner === 'home' ? 'eliminated' : ''}"><div class="ko-team-info">`;
        if (awayTeam) {
            html += `<img class="ko-flag" src="${getFlagUrl(awayTeam.code)}" alt="${awayTeam.name}" loading="lazy">`;
            html += `<span class="ko-name">${awayTeam.name}</span>`;
        } else {
            html += `<div class="ko-flag-placeholder"></div><span class="ko-placeholder">Por definir</span>`;
        }
        html += '</div>';
        if (canPredict) {
            const val = pred ? pred.a : '';
            html += `<input type="number" class="ko-score-input" data-match="${match.id}" data-side="a" value="${val}" min="0" max="20" placeholder="-" onchange="App.onKnockoutScoreChange(this)">`;
        }
        html += '</div>';

        // Penalty selector
        if (needsPenalty) {
            html += `<div class="penalty-selector">`;
            html += `<span class="penalty-label">⚽ Penales:</span>`;
            html += `<button class="penalty-btn ${pred.winner === 'home' ? 'selected' : ''}" data-match="${match.id}" data-winner="home" onclick="App.onPenaltyPick(this)">${homeTeam.name}</button>`;
            html += `<button class="penalty-btn ${pred.winner === 'away' ? 'selected' : ''}" data-match="${match.id}" data-winner="away" onclick="App.onPenaltyPick(this)">${awayTeam.name}</button>`;
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function onKnockoutScoreChange(input) {
        if (!currentUser) return;
        const matchId = input.dataset.match;
        const matchEl = input.closest('.bracket-match');
        const inputs = matchEl.querySelectorAll('.ko-score-input');
        const hInput = [...inputs].find(i => i.dataset.side === 'h');
        const aInput = [...inputs].find(i => i.dataset.side === 'a');
        const hVal = hInput?.value, aVal = aInput?.value;

        if (hVal !== '' && aVal !== '') {
            Store.saveKnockoutPrediction(matchId, hVal, aVal, null);
            updateBracketInPlace();
        }
    }

    function onPenaltyPick(btn) {
        if (!currentUser) return;
        const matchId = btn.dataset.match;
        const winner = btn.dataset.winner;
        const preds = Store.getKnockoutPredictions(currentUser.uid);
        const pred = preds[matchId];
        if (!pred) return;
        Store.saveKnockoutPrediction(matchId, pred.h, pred.a, winner);
        updateBracketInPlace();
    }

    // --- Surgical DOM updates (no full re-render) ---
    function updateBracketInPlace() {
        const predictions = Store.getPredictions(currentUser.uid);
        const knockoutPreds = Store.getKnockoutPredictions(currentUser.uid);
        const bracketData = Store.resolveKnockoutBracket(predictions, knockoutPreds);
        if (!bracketData) return;

        ['r32', 'r16', 'qf', 'sf', 'final'].forEach(round => {
            KNOCKOUT_BRACKET[round].forEach(match => {
                patchMatchCard(match, bracketData, knockoutPreds);
            });
        });
        patchChampion(bracketData, knockoutPreds);
    }

    function patchMatchCard(match, bracketData, knockoutPreds) {
        const el = document.getElementById(`ko-${match.id}`);
        if (!el) return;

        const resolved = bracketData.resolved[match.id];
        const pred = knockoutPreds[match.id];
        const homeTeam = resolved?.home ? TEAMS[resolved.home] : null;
        const awayTeam = resolved?.away ? TEAMS[resolved.away] : null;

        let winner = null;
        if (pred && pred.h !== undefined && pred.a !== undefined) {
            if (pred.h > pred.a) winner = 'home';
            else if (pred.a > pred.h) winner = 'away';
            else winner = pred.winner || null;
        }

        const canPredict = homeTeam && awayTeam;
        const needsPenalty = pred && pred.h !== undefined && pred.a !== undefined && pred.h === pred.a;

        el.classList.toggle('has-winner', !!winner);

        const teamRows = el.querySelectorAll(':scope > .ko-team');
        if (teamRows[0]) patchTeamRow(teamRows[0], homeTeam, 'home', winner, match.id, pred, canPredict, 'h');
        if (teamRows[1]) patchTeamRow(teamRows[1], awayTeam, 'away', winner, match.id, pred, canPredict, 'a');

        // Penalty selector
        let penaltyEl = el.querySelector('.penalty-selector');
        if (needsPenalty && canPredict) {
            if (!penaltyEl) {
                penaltyEl = document.createElement('div');
                penaltyEl.className = 'penalty-selector';
                penaltyEl.innerHTML =
                    `<span class="penalty-label">⚽ Penales:</span>` +
                    `<button class="penalty-btn ${pred.winner === 'home' ? 'selected' : ''}" data-match="${match.id}" data-winner="home" onclick="App.onPenaltyPick(this)">${homeTeam.name}</button>` +
                    `<button class="penalty-btn ${pred.winner === 'away' ? 'selected' : ''}" data-match="${match.id}" data-winner="away" onclick="App.onPenaltyPick(this)">${awayTeam.name}</button>`;
                el.appendChild(penaltyEl);
            } else {
                penaltyEl.querySelectorAll('.penalty-btn').forEach(btn => {
                    btn.classList.toggle('selected', btn.dataset.winner === pred.winner);
                    if (btn.dataset.winner === 'home' && homeTeam) btn.textContent = homeTeam.name;
                    if (btn.dataset.winner === 'away' && awayTeam) btn.textContent = awayTeam.name;
                });
            }
        } else if (penaltyEl) {
            penaltyEl.remove();
        }
    }

    function patchTeamRow(el, team, side, winner, matchId, pred, canPredict, scoreSide) {
        // Update classes without replacing the element
        el.className = 'ko-team' +
            (winner === side ? ' advances' : '') +
            (winner && winner !== side ? ' eliminated' : '');

        // Update team info
        const infoEl = el.querySelector('.ko-team-info');
        if (infoEl) {
            const flagImg = infoEl.querySelector('.ko-flag');
            const nameEl = infoEl.querySelector('.ko-name');
            const placeholder = infoEl.querySelector('.ko-placeholder');

            if (team && placeholder) {
                // Transition: placeholder → real team
                infoEl.innerHTML = `<img class="ko-flag" src="${getFlagUrl(team.code)}" alt="${team.name}" loading="lazy"><span class="ko-name">${team.name}</span>`;
            } else if (team && flagImg && nameEl) {
                // Update existing team if different
                if (nameEl.textContent !== team.name) {
                    nameEl.textContent = team.name;
                    flagImg.src = getFlagUrl(team.code);
                    flagImg.alt = team.name;
                }
            } else if (!team && flagImg) {
                // Transition: real team → placeholder
                infoEl.innerHTML = `<div class="ko-flag-placeholder"></div><span class="ko-placeholder">Por definir</span>`;
            }
        }

        // Score input: add if needed, remove if not
        let scoreInput = el.querySelector('.ko-score-input');
        if (canPredict && !scoreInput) {
            const val = pred ? pred[scoreSide] : '';
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'ko-score-input';
            input.dataset.match = matchId;
            input.dataset.side = scoreSide;
            input.value = val !== undefined && val !== null ? val : '';
            input.min = '0';
            input.max = '20';
            input.placeholder = '-';
            input.setAttribute('onchange', 'App.onKnockoutScoreChange(this)');
            el.appendChild(input);
        } else if (!canPredict && scoreInput) {
            scoreInput.remove();
        }
    }

    function patchChampion(bracketData, knockoutPreds) {
        const wrapper = document.querySelector('.bracket-wrapper');
        const existing = wrapper?.querySelector('.champion-reveal');
        const finalResolved = bracketData.resolved['F-1'];
        const finalPred = knockoutPreds['F-1'];

        let championCode = null;
        if (finalResolved && finalPred && finalPred.h !== undefined) {
            if (finalPred.h > finalPred.a) championCode = finalResolved.home;
            else if (finalPred.a > finalPred.h) championCode = finalResolved.away;
            else if (finalPred.winner === 'home') championCode = finalResolved.home;
            else if (finalPred.winner === 'away') championCode = finalResolved.away;
        }

        if (championCode && TEAMS[championCode]) {
            const champ = TEAMS[championCode];
            if (existing) {
                const nameEl = existing.querySelector('.champion-name');
                const flagEl = existing.querySelector('.champion-flag');
                if (nameEl) nameEl.textContent = champ.name;
                if (flagEl) { flagEl.src = getFlagUrl(champ.code); flagEl.alt = champ.name; }
            } else if (wrapper) {
                const div = document.createElement('div');
                div.className = 'champion-reveal';
                div.innerHTML = `<div class="champion-trophy">🏆</div>
                    <div class="champion-label">Tu Campeón del Mundo</div>
                    <div class="champion-team">
                        <img src="${getFlagUrl(champ.code)}" class="champion-flag" alt="${champ.name}">
                        <span class="champion-name">${champ.name}</span>
                    </div>`;
                wrapper.appendChild(div);
            }
        } else if (existing) {
            existing.remove();
        }
    }

    function bindBracketTabs() {
        const tabsContainer = document.getElementById('bracketTabs');
        if (!tabsContainer) return;
        tabsContainer.addEventListener('click', e => {
            if (!e.target.classList.contains('bracket-tab')) return;
            tabsContainer.querySelectorAll('.bracket-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const round = e.target.dataset.round;
            document.querySelectorAll('.bracket-round').forEach(r => {
                r.classList.toggle('round-active', r.dataset.round === round);
            });
        });
    }

    // --- Prize & Share ---
    function renderPrize() {
        if (!currentUser) {
            fixtureMain.innerHTML = `<div class="no-results"><div class="no-results-icon">🔐</div><div class="no-results-text">Iniciá sesión para configurar tu prode</div></div>`;
            return;
        }

        const prize = Store.getPrize();
        const competitors = Store.getCompetitors();

        let html = '<div class="prize-wrapper">';

        // --- Prize Section ---
        html += '<div class="prize-section">';
        html += '<h2 class="section-title"><span class="section-icon">🏆</span> Premio en juego</h2>';

        if (prize && prize.title) {
            html += `<div class="prize-card">
                <div class="prize-card-glow"></div>
                <div class="prize-icon">🏆</div>
                <h3 class="prize-title">${escapeHtml(prize.title)}</h3>
                ${prize.description ? `<p class="prize-description">${escapeHtml(prize.description)}</p>` : ''}
                ${prize.value ? `<div class="prize-value">${escapeHtml(prize.value)}</div>` : ''}
                ${prize.setBy ? `<div class="prize-set-by">Configurado por ${escapeHtml(prize.setBy)}</div>` : ''}
                <button class="btn-edit-prize" onclick="App.editPrize()">✏️ Editar</button>
            </div>`;
        } else {
            html += `<div class="prize-empty">
                <div class="prize-empty-icon">🎯</div>
                <p>Todavía no hay premio configurado</p>
                <p class="prize-empty-hint">Definí qué se juega para darle más emoción</p>
                <button class="btn-set-prize" onclick="App.editPrize()">Configurar premio</button>
            </div>`;
        }
        html += '</div>';

        // --- Prize Edit Form (hidden) ---
        html += `<div class="prize-form-container" id="prizeForm" style="display:none;">
            <div class="prize-form">
                <h3 class="form-title">✏️ Configurar Premio</h3>
                <div class="form-group">
                    <label>¿Qué se juega?</label>
                    <input type="text" id="prizeTitle" class="form-input" placeholder="Ej: Asado, Cena, Remera..." value="${prize?.title ? escapeHtml(prize.title) : ''}" maxlength="60">
                </div>
                <div class="form-group">
                    <label>Descripción (opcional)</label>
                    <textarea id="prizeDesc" class="form-textarea" placeholder="Ej: El último del ranking paga el asado..." maxlength="200">${prize?.description ? escapeHtml(prize.description) : ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Valor (opcional)</label>
                    <input type="text" id="prizeValue" class="form-input" placeholder="Ej: $50.000, Una cena, etc." value="${prize?.value ? escapeHtml(prize.value) : ''}" maxlength="30">
                </div>
                <div class="form-actions">
                    <button class="btn-cancel" onclick="App.cancelPrize()">Cancelar</button>
                    <button class="btn-save" onclick="App.savePrizeForm()">Guardar</button>
                </div>
            </div>
        </div>`;

        // --- Share Section ---
        html += '<div class="share-section">';
        html += '<h2 class="section-title"><span class="section-icon">🔗</span> Compartir y Competir</h2>';
        html += '<p class="share-subtitle">Generá un código para que tus amigos importen tus predicciones y compitan con vos en el ranking</p>';

        html += `<div class="share-actions">
            <button class="btn-share" onclick="App.shareProde()">
                <span class="share-btn-icon">📤</span>
                <span>Compartir mi Prode</span>
            </button>
        </div>`;

        html += `<div class="share-output" id="shareOutput" style="display:none;">
            <label class="share-label">Tu código para compartir:</label>
            <div class="share-code-box">
                <textarea class="share-code-text" id="shareCodeText" readonly></textarea>
                <button class="btn-copy" onclick="App.copyShareCode()">📋 Copiar</button>
            </div>
            <div class="share-copied" id="shareCopied" style="display:none;">✅ ¡Copiado al portapapeles!</div>
        </div>`;

        // --- Import ---
        html += `<div class="import-section">
            <h3 class="import-title">📥 Importar un Prode</h3>
            <p class="import-subtitle">¿Te pasaron un código? Pegalo acá para competir</p>
            <div class="import-form">
                <textarea class="import-input" id="importCode" placeholder="Pegá el código acá..."></textarea>
                <button class="btn-import" onclick="App.importProde()">Importar</button>
            </div>
            <div class="import-result" id="importResult" style="display:none;"></div>
        </div>`;

        // --- Competitors ---
        if (competitors.length > 0) {
            html += '<div class="competitors-section">';
            html += '<h3 class="competitors-title">👥 Competidores conectados</h3>';
            html += '<div class="competitors-list">';
            competitors.forEach(c => {
                html += `<div class="competitor-card">
                    <div class="competitor-avatar">${c.name[0].toUpperCase()}</div>
                    <div class="competitor-info">
                        <span class="competitor-name">${escapeHtml(c.name)}</span>
                        <span class="competitor-preds">${c.predictions} predicciones</span>
                    </div>
                    <button class="btn-remove-competitor" onclick="App.removeCompetitor('${c.uid}')" title="Eliminar">✕</button>
                </div>`;
            });
            html += '</div></div>';
        }

        html += '</div></div>';
        fixtureMain.innerHTML = html;
    }

    function editPrize() {
        const form = document.getElementById('prizeForm');
        if (form) form.style.display = '';
    }

    function cancelPrize() {
        const form = document.getElementById('prizeForm');
        if (form) form.style.display = 'none';
    }

    function savePrizeForm() {
        const title = document.getElementById('prizeTitle')?.value.trim();
        const desc = document.getElementById('prizeDesc')?.value.trim();
        const value = document.getElementById('prizeValue')?.value.trim();
        Store.savePrize({ title, description: desc, value });
        showNotification('✅ Premio guardado');
        renderPrize();
    }

    function shareProde() {
        const code = Store.generateShareCode();
        if (!code) {
            showNotification('Error al generar el código', 'error');
            return;
        }
        const output = document.getElementById('shareOutput');
        const codeText = document.getElementById('shareCodeText');
        if (output && codeText) {
            const isFile = window.location.protocol === 'file:';
            codeText.value = isFile ? code : `${window.location.origin}${window.location.pathname}#share=${code}`;
            output.style.display = '';
        }
        copyShareCode();
    }

    function copyShareCode() {
        const codeText = document.getElementById('shareCodeText');
        if (!codeText) return;
        navigator.clipboard?.writeText(codeText.value).then(() => {
            const copied = document.getElementById('shareCopied');
            if (copied) { copied.style.display = ''; }
            setTimeout(() => { if (copied) copied.style.display = 'none'; }, 3000);
        });
    }

    function importProde() {
        const input = document.getElementById('importCode');
        const resultEl = document.getElementById('importResult');
        if (!input || !resultEl) return;

        let code = input.value.trim();
        if (!code) {
            resultEl.innerHTML = '<span class="import-error">⚠️ Pegá un código para importar</span>';
            resultEl.style.display = '';
            return;
        }
        // If pasted a full URL, extract the code
        const hashIdx = code.indexOf('#share=');
        if (hashIdx !== -1) code = code.substring(hashIdx + 7);

        const result = Store.importShareCode(code);
        if (result.success) {
            resultEl.innerHTML = `<span class="import-success">✅ Prode de "${escapeHtml(result.name)}" importado. ¡Ya aparece en tu ranking!</span>`;
            input.value = '';
            showNotification(`🎉 ${result.name} se unió a tu prode`);
            setTimeout(() => renderPrize(), 800);
        } else {
            resultEl.innerHTML = `<span class="import-error">❌ ${result.error}</span>`;
        }
        resultEl.style.display = '';
    }

    function removeCompetitor(uid) {
        Store.removeCompetitor(uid);
        showNotification('Competidor eliminado');
        renderPrize();
    }

    function checkShareUrl() {
        const hash = window.location.hash;
        if (!hash.startsWith('#share=')) return;
        const code = decodeURIComponent(hash.substring(7));
        if (!code) return;
        const result = Store.importShareCode(code);
        if (result.success) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
            showNotification(`✅ Prode de "${result.name}" importado correctamente`);
        }
    }

    function showNotification(message, type) {
        const notif = document.createElement('div');
        notif.className = 'notification' + (type === 'error' ? ' notification-error' : '');
        notif.textContent = message;
        document.body.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // --- Helpers ---
    function createParticles() {
        const c = $('particles'); if (!c) return;
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 8 + 's';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            const colors = ['#00d4ff', '#7b2ff7', '#ff2d95', '#ffd700'];
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (2 + Math.random() * 3) + 'px';
            p.style.height = p.style.width;
            c.appendChild(p);
        }
    }

    function startCountdown() {
        const target = new Date('2026-06-11T19:00:00Z');
        function update() {
            const diff = target - new Date();
            if (diff <= 0) { $('days').textContent = '🎉'; return; }
            $('days').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
            $('hours').textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
            $('minutes').textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
            $('seconds').textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        }
        update(); setInterval(update, 1000);
    }

    function populateVenueFilter() {
        const sel = $('filterVenue');
        Object.keys(VENUES).sort((a, b) => VENUES[a].name.localeCompare(VENUES[b].name)).forEach(k => {
            const o = document.createElement('option');
            o.value = k; o.textContent = `${VENUES[k].country} ${VENUES[k].name}`;
            sel.appendChild(o);
        });
    }

    function getFlagUrl(code) {
        const map = { 'GB-SCT': 'gb-sct', 'GB-ENG': 'gb-eng' };
        const c = map[code] || code.toLowerCase();
        return `https://flagcdn.com/w40/${c}.png`;
    }

    function parseDate(str) { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); }
    function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

    // Boot
    document.addEventListener('DOMContentLoaded', init);

    return { doGoogleLogin, logout, onScoreChange, onKnockoutScoreChange, onPenaltyPick, editPrize, cancelPrize, savePrizeForm, shareProde, copyShareCode, importProde, removeCompetitor, renderView };
})();
