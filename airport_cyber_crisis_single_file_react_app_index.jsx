<!--
File: index.html
Purpose: Arcade-style cyber incident response game (airport theme). Deployable on GitHub Pages.

TL;DR
- Single-file React app (index.html) using CDN React + Babel so it runs on GitHub Pages without build step.
- 30-minute timer (1800s), 10 multiple-choice incident scenarios, 60s penalty per wrong answer, player name input, end-of-game leaderboard stored in localStorage.
- Includes inline SVG graphics and small base64-encoded audio cues so repo is self-contained.

PLAN / PSEUDOCODE
1. UI screens: Welcome (name input), Game (question carousel + timer), End (score + leaderboard).
2. State: playerName, currentQuestionIndex, remainingTime (seconds), score, answersCorrect, leaderboard (localStorage), playing flag.
3. Timer: setInterval that decreases remainingTime every second; if reaches 0 end game. Incorrect answer subtracts PENALTY seconds (clamped to 0).
4. Questions: 10 crafted airport-themed cyber IR scenarios with 4 choices each and one correct index. Each question gives points (100 + remainingTime bonus per question) and immediate feedback sound/visual.
5. Leaderboard: top 10 entries sorted by score then time left. Inputs saved to localStorage as JSON.
6. Sounds: base64 small beep/ding/wrong. Graphics: inline SVGs (airport, plane, shield) and CSS arcade look.
7. Accessibility: keyboard navigation for choices, focus, aria attributes.

--------------------------------------
FULL SINGLE-FILE APP (index.html)
Paste this file at the repo root (index.html). Commit + push to GitHub, enable GitHub Pages for branch main -> / (or simply open file locally).

-->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Airport Cyber Crisis — STEM Challenge</title>
  <style>
    /* Minimal arcade styling */
    :root{--bg:#07102a;--card:#0e2748;--accent:#00e5ff;--accent2:#ffde00;--muted:#9fb7d6}
    html,body,#root{height:100%;margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial}
    body{background:radial-gradient(ellipse at 10% 10%,#07243a 0%, transparent 40%), linear-gradient(180deg,#041226 0%, #07102a 100%);color:#e6f7ff}
    .container{max-width:980px;margin:24px auto;padding:20px}
    .card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.04);box-shadow:0 8px 30px rgba(4,10,30,0.7);border-radius:14px;padding:18px}
    header{display:flex;align-items:center;gap:12px}
    h1{margin:0;font-size:20px;letter-spacing:0.6px}
    .logo{width:64px;height:64px;background:linear-gradient(135deg,var(--accent),#9b59ff);display:flex;align-items:center;justify-content:center;border-radius:12px}
    .muted{color:var(--muted)}
    .big{font-size:28px}
    .grid{display:grid;grid-template-columns:1fr 340px;gap:16px;margin-top:16px}
    .question-area{padding:12px}
    .choices{display:flex;flex-direction:column;gap:10px;margin-top:12px}
    .choice{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.05));padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.03);cursor:pointer;display:flex;align-items:center;gap:12px}
    .choice:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,0.6)}
    .choice.correct{outline:3px solid rgba(0,255,170,0.12);background:linear-gradient(90deg, rgba(0,255,170,0.03), rgba(0,0,0,0.02))}
    .choice.wrong{outline:3px solid rgba(255,50,50,0.12);background:linear-gradient(90deg, rgba(255,50,50,0.03), rgba(0,0,0,0.02))}
    .timer{font-family:monospace;background:rgba(0,0,0,0.15);padding:8px 12px;border-radius:10px}
    .progress{height:10px;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden}
    .progress > i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));width:50%}
    .center{display:flex;align-items:center;justify-content:center}
    .kbd{background:#0b2238;border-radius:6px;padding:6px 8px;font-family:monospace}
    footer{margin-top:18px;display:flex;justify-content:space-between;align-items:center}
    .leaderboard{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));padding:12px;border-radius:12px}
    .small{font-size:12px}
    button.btn{background:linear-gradient(90deg,var(--accent),#7b61ff);border:0;color:#021;padding:10px 14px;border-radius:10px;cursor:pointer;font-weight:700}
    input[type=text]{padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.12);color:inherit}
    .footer-note{color:var(--muted);font-size:12px;margin-top:8px}
    @media (max-width:900px){.grid{grid-template-columns:1fr;margin-top:12px}}
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- React + Babel (no build) -->
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <script type="text/babel">
  const {useState,useEffect,useRef} = React;

  // CONFIG
  const TOTAL_TIME = 30 * 60; // 30 minutes in seconds
  const PENALTY = 60; // 60s penalty per wrong answer
  const POINTS_PER_CORRECT = 100;

  // base64 tiny sounds (short beep/ding) - generated small tones
  const SOUND_DING = 'data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YWQAAABkAAAA';
  const SOUND_WRONG = 'data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YWQAAABmAAAA';

  // Inline SVG graphics as React components
  function AirportGraphic(){
    return (
      <svg width="100%" height="100" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stopColor="#00e5ff"/><stop offset="1" stopColor="#7b61ff"/></linearGradient>
        </defs>
        <rect x="0" y="0" width="600" height="120" rx="12" fill="url(#g1)" opacity="0.06" />
        <g transform="translate(10,14)">
          <rect x="0" y="40" width="220" height="48" rx="8" fill="#071b2f" stroke="#08283e" />
          <circle cx="420" cy="70" r="18" fill="#ffd966" opacity="0.9" />
          <g transform="translate(260,0)">
            <path d="M0 84 L40 60 L82 82 L102 78 L72 48 L100 34 L86 24 L60 44 L34 24 L20 34 L48 48 L18 78 Z" fill="#9bd3ff" opacity="0.95"/>
          </g>
        </g>
      </svg>
    );
  }

  // QUESTIONS: 10 airport-themed cyber incident response scenarios
  const QUESTIONS = [
    {
      id:1,
      title:'A suspicious Wi‑Fi network named "Airport_Guest_FREE" appears near the gate. Several staff connect and report slow systems. What's your first action?',
      choices:[
        'Block the SSID at the airport Wi‑Fi controller and kick connected clients',
        'Notify passengers to avoid the Wi‑Fi and post signs',
        'Disconnect and isolate affected staff devices from the network',
        'Scan the network with an unauthenticated tool to enumerate devices'
      ],
      correct:2,
      explanation:'Isolate affected devices to stop spread and preserve evidence before broad changes.'
    },
    {
      id:2,
      title:'An employee reports receiving an email requesting payroll info with a spoofed lookalike domain. What is priority?',
      choices:['Delete the email and move on','Reset the employee's password immediately','Quarantine the email and preserve headers for analysis','Publish the email contents to staff to warn them'],
      correct:2,
      explanation:'Preserve email headers and quarantine for investigation; resetting only for confirmed compromise.'n
    },
    {
      id:3,
      title:'Flight display screens show incorrect schedules and images have been replaced. What does this indicate and your immediate step?',
      choices:['Hardware failure—reboot displays','Defacement—take displays offline and collect logs','Normal update—wait 24 hours','Contact the display vendor only'],
      correct:1,
      explanation:'Defacement suggests compromise of the display system; take affected systems offline to contain and collect logs.'
    },
    {
      id:4,
      title:'Security cameras are reporting intermittent disconnects. You find malware beaconing from a camera IP. Next?',
      choices:['Power off all cameras','Isolate the camera network segment and capture network traffic','Replace the camera firmware immediately','Ignore; cameras are low priority'],
      correct:1,
      explanation:'Isolate and capture traffic to analyze the threat and scope before destructive actions.'
    },
    {
      id:5,
      title:'A vendor working on the Baggage Handling System reports they're locked out and see ransom notes. What's next?',
      choices:['Pay the ransom to restore operations quickly','Activate business continuity plans and isolate infected systems','Shut down the airport operations entirely','Publicly name the vendor as incompetent'],
      correct:1,
      explanation:'Activate continuity plans and isolate infected systems; paying ransom is not the immediate step.'
    },
    {
      id:6,
      title:'Passenger data export shows unusual volume. You suspect data exfiltration. Which is highest priority?',
      choices:['Notify regulators immediately','Identify and contain the exfiltration path, preserve logs','Delete the exported files','Ask the passenger to confirm their data was exported'],
      correct:1,
      explanation:'Containment & evidence preservation are urgent before notifications.'
    },
    {
      id:7,
      title:'A technician plugged an unknown USB into a ground operations laptop; it started installing software. What do you do?',
      choices:['Wipe the laptop immediately','Isolate the laptop, image drive, and investigate','Install antivirus and run a quick scan','Ignore if laptop seems to run fine'],
      correct:1,
      explanation:'Isolate and image for forensic analysis to determine scope and preserve evidence.'
    },
    {
      id:8,
      title:'A false identity credential was used to access the staff lounge. Access logs show badge cloning. Best response?',
      choices:['Reissue badges to all staff','Audit access logs, remove cloned badges, increase physical checks','Close staff lounge','Disable all badge readers permanently'],
      correct:1,
      explanation:'Audit and remove the cloned credentials and tighten physical checks; broad disabling is disruptive.'
    },
    {
      id:9,
      title:'You find an exposed admin interface to the airport’s HVAC on the public internet. Immediate action?',
      choices:['Contact HVAC vendor and leave it','Block public access at the network edge and notify stakeholders','Use the admin interface to change settings to safe defaults','Create an exploit to test it'],
      correct:1,
      explanation:'Block public access immediately to prevent misuse, then coordinate with vendor.'
    },
    {
      id:10,
      title:'Threat intel shows targeted phishing campaign aimed at ground staff. How to reduce impact?',
      choices:['Run a phishing awareness and simulated campaign immediately','Disable all email to ground staff','Fire the ground staff','Ignore until an incident occurs'],
      correct:0,
      explanation:'Run awareness combined with simulated phishing to reduce susceptibility.'
    }
  ];

  // fix malformed question 2 correct index (zero-based)
  QUESTIONS[1].correct = 2; // quarantine email => index 2

  function formatTime(seconds){
    const m = Math.floor(seconds/60).toString().padStart(2,'0');
    const s = (seconds%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function useAudio(src){
    const ref = useRef(null);
    useEffect(()=>{ ref.current = new Audio(src); },[src]);
    return ()=>{ if(ref.current){ try{ ref.current.currentTime=0; ref.current.play(); }catch(e){ } } };
  }

  function App(){
    const [stage,setStage] = useState('welcome');
    const [name,setName] = useState(localStorage.getItem('arc_player') || '');
    const [timeLeft,setTimeLeft] = useState(TOTAL_TIME);
    const [qIndex,setQIndex] = useState(0);
    const [answers,setAnswers] = useState([]);
    const [score,setScore] = useState(0);
    const [feedback,setFeedback] = useState(null);
    const [leaderboard,setLeaderboard] = useState(JSON.parse(localStorage.getItem('airport_leaderboard')||'[]'));

    const ding = useAudio(SOUND_DING);
    const wrong = useAudio(SOUND_WRONG);

    // Timer
    useEffect(()=>{
      if(stage !== 'playing') return;
      const t = setInterval(()=>{
        setTimeLeft(t=>{
          if(t<=1){ clearInterval(t); return 0; }
          return t-1;
        });
      },1000);
      return ()=>clearInterval(t);
    },[stage]);

    // End when time hits zero
    useEffect(()=>{ if(timeLeft<=0 && stage==='playing'){ endGame(); } },[timeLeft]);

    function startGame(){
      if(!name.trim()){ alert('Please enter a player name (short).'); return; }
      localStorage.setItem('arc_player', name);
      setTimeLeft(TOTAL_TIME);
      setQIndex(0);
      setAnswers([]);
      setScore(0);
      setFeedback(null);
      setStage('playing');
    }

    function endGame(){
      setStage('end');
      const entry = {name,score,correct:answers.filter(a=>a.correct).length,timeLeft, date:(new Date()).toISOString()};
      const updated = [...leaderboard,entry].sort((a,b)=> b.score - a.score || b.timeLeft - a.timeLeft).slice(0,10);
      setLeaderboard(updated);
      localStorage.setItem('airport_leaderboard', JSON.stringify(updated));
    }

    function choose(idx){
      if(stage!=='playing') return;
      const q = QUESTIONS[qIndex];
      const isCorrect = idx === q.correct;
      const newAnswers = [...answers, {qId:q.id, choice:idx, correct:isCorrect, timeLeft}];
      setAnswers(newAnswers);
      if(isCorrect){
        const pts = POINTS_PER_CORRECT + Math.floor(timeLeft/60); // bonus from remaining time
        setScore(s=>s+pts);
        setFeedback({type:'ok',text:'Correct! +' + pts});
        ding();
      } else {
        setTimeLeft(t=>Math.max(0,t-PENALTY));
        setFeedback({type:'bad',text:`Wrong! -${PENALTY}s`});
        wrong();
      }
      // reveal and then next after short delay
      setTimeout(()=>{
        if(qIndex+1 >= QUESTIONS.length) endGame(); else setQIndex(i=>i+1);
        setFeedback(null);
      },1200);
    }

    function resetLeaderboard(){ if(confirm('Clear leaderboard?')){ setLeaderboard([]); localStorage.removeItem('airport_leaderboard'); } }

    // Derived
    const current = QUESTIONS[qIndex];
    const progressPct = Math.round((qIndex/QUESTIONS.length)*100);

    return (
      <div className="container">
        <div className="card">
          <header>
            <div className="logo">
              <svg width="36" height="36" viewBox="0 0 24 24"><path fill="#021" d="M2 12h20v10H2z" opacity="0.06"/><path d="M12 2l3 6h5l-4 3 1 6-5-3-5 3 1-6-4-3h5z" fill="#00e5ff"/></svg>
            </div>
            <div>
              <h1>Airport Cyber Crisis</h1>
              <div className="muted small">Arcade-style incident response challenge — 30 minutes, 10 scenarios</div>
            </div>
            <div style={{marginLeft:'auto',textAlign:'right'}}>
              <div className="timer">⏱ {formatTime(timeLeft)}</div>
              <div className="muted small">Score: <strong>{score}</strong></div>
            </div>
          </header>

          {stage === 'welcome' && (
            <div className="grid">
              <div className="question-area">
                <h2 className="big">Welcome, responder</h2>
                <p className="muted">Type your player name and press <span className="kbd">Start</span>. Solve 10 airport-themed cyber incidents. Wrong answers cost {PENALTY}s each. Good luck!</p>
                <div style={{marginTop:12}}>
                  <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Player name" />
                  <button className="btn" style={{marginLeft:8}} onClick={startGame}>Start</button>
                </div>
                <div style={{marginTop:16}} className="leaderboard card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div><strong>Top responders</strong></div>
                    <button onClick={resetLeaderboard} className="small" style={{background:'transparent',border:0,color:'var(--muted)',cursor:'pointer'}}>Clear</button>
                  </div>
                  <ol style={{paddingLeft:18,marginTop:8}}>
                    {leaderboard.length===0 && <li className="muted small">No scores yet — be the first!</li>}
                    {leaderboard.map((l,idx)=> (
                      <li key={idx} className="small">{l.name} — {l.score} pts — {l.correct||0} correct</li>
                    ))}
                  </ol>
                </div>
                <div className="footer-note">Deploy: push this index.html to GitHub repo root and enable Pages (branch main).</div>
              </div>
              <div className="card">
                <AirportGraphic />
                <div style={{marginTop:12}}>
                  <strong>How scoring works</strong>
                  <p className="muted small">Each correct answer grants {POINTS_PER_CORRECT} + small time bonus. Incorrect answers subtract {PENALTY} seconds. Final leaderboard ranks by score then time left.</p>
                </div>
              </div>
            </div>
          )}

          {stage === 'playing' && (
            <div className="grid">
              <div className="question-area">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div className="muted">Question {qIndex+1} / {QUESTIONS.length}</div>
                    <h2 style={{marginTop:6}}>{current.title}</h2>
                  </div>
                  <div style={{width:220}}>
                    <div className="progress"><i style={{width:progressPct+'%'}} /></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                      <div className="muted small">Progress</div>
                      <div className="muted small">{progressPct}%</div>
                    </div>
                  </div>
                </div>

                <div className="choices" role="list">
                  {current.choices.map((c,i)=>{
                    const cls = 'choice';
                    return (
                      <div key={i} role="listitem" tabIndex={0} className={cls} onClick={()=>choose(i)} onKeyDown={(e)=>{ if(e.key==='Enter') choose(i); }}>
                        <div style={{width:36,height:36,background:'rgba(255,255,255,0.03)',borderRadius:8,display:'grid',placeItems:'center',fontWeight:700,color:'var(--accent)'}}>{String.fromCharCode(65+i)}</div>
                        <div>{c}</div>
                      </div>
                    );
                  })}
                </div>

                {feedback && (
                  <div style={{marginTop:12}} className={feedback.type==='ok'? 'muted' : 'muted'}>
                    <strong>{feedback.text}</strong>
                  </div>
                )}

              </div>

              <aside className="card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div className="muted">Responder</div>
                    <div style={{fontWeight:800}}>{name}</div>
                  </div>
                  <div className="center">
                    <div style={{textAlign:'center'}}>
                      <div className="muted small">Time</div>
                      <div className="big">{formatTime(timeLeft)}</div>
                    </div>
                  </div>
                </div>

                <hr style={{margin:'12px 0',border:'none',borderTop:'1px solid rgba(255,255,255,0.04)'}} />
                <div>
                  <div className="muted small">Score</div>
                  <div style={{fontSize:20,fontWeight:800}}>{score}</div>
                </div>

                <div style={{marginTop:12}}>
                  <button className="btn" onClick={()=>{ if(confirm('End run early?')) endGame(); }}>End Run</button>
                </div>

                <div style={{marginTop:18}}>
                  <strong>Tips</strong>
                  <ul className="muted small">
                    <li>Prioritize isolation and evidence preservation.</li>
                    <li>Use least disruptive containment first.</li>
                    <li>Coordinate with vendors and operations teams.</li>
                  </ul>
                </div>

                <div style={{marginTop:12}} className="leaderboard">
                  <strong>Live Top</strong>
                  <ol style={{paddingLeft:18,marginTop:6}}>
                    {leaderboard.slice(0,5).map((l,idx)=>(<li key={idx} className="small">{l.name} — {l.score} pts</li>))}
                    {leaderboard.length===0 && <li className="small muted">No entries yet</li>}
                  </ol>
                </div>

              </aside>
            </div>
          )}

          {stage === 'end' && (
            <div style={{marginTop:14}}>
              <h2>Run Complete</h2>
              <p className="muted">You scored <strong>{score}</strong> points and answered <strong>{answers.filter(a=>a.correct).length}</strong> correct out of {QUESTIONS.length}.</p>

              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <button className="btn" onClick={()=>{ setStage('welcome'); }}>Play Again</button>
                <button className="btn" onClick={()=>{ navigator.clipboard?.writeText(`I scored ${score} in Airport Cyber Crisis!`).then(()=>alert('Copied brag text to clipboard.')) }}>Share Score</button>
              </div>

              <div style={{marginTop:12}} className="card">
                <h3>Leaderboard — Top</h3>
                <ol>
                  {leaderboard.map((l,idx)=> (
                    <li key={idx}>{idx+1}. {l.name} — {l.score} pts — {l.correct||0} correct — <span className="muted small">{new Date(l.date).toLocaleString()}</span></li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <footer>
            <div className="muted small">Built for STEM event — airport incident response theme</div>
            <div className="muted small">Use this on GitHub Pages: push index.html to repo root</div>
          </footer>
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
