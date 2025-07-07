document.addEventListener('DOMContentLoaded', () => {
  // Shared data fetch
  fetch('data/melbourne_fl_summary.txt')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(txt => {
      const L = txt.split('\n');

      // Current Weather
      if (document.getElementById('weather-summary')) {
        // Date & Updated
        const now = new Date();
        document.getElementById('current-date').textContent =
          `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
        const gen = L.find(l => l.startsWith('Generated:'));
        if (gen) document.getElementById('last-updated').textContent =
          gen.replace('Generated:','').trim();

        // Extract values
        const curr    = L.find(l=>l.startsWith('Temp:'))||'';
        const tM      = curr.match(/Temp: ([\d.]+)°F/);
        const hM      = curr.match(/Humidity: ([\d.]+)%/);
        const today   = L.find(l=>l.startsWith('• Today:'))||'';
        const rainM   = today.match(/Rain: (\d+)%/);
        const windM   = today.match(/Wind: ([^;]+)/);
        const foreM   = today.match(/—\s*([^.;]+)/);
        const maxM    = curr.match(/High: (\d+)°F/);
        const tonight = L.find(l=>l.startsWith('• Tonight:'))||'';
        const minM    = tonight.match(/Low: (\d+)°F/);

        // Sparkline
        const highs = [ maxM&&+maxM[1], minM&&+minM[1], (L.find(l=>l.startsWith('• Tomorrow:'))||'').match(/High: (\d+)°F/)&&+RegExp.$1 ].filter(v=>v!=null);
        const c = document.getElementById('temp-sparkline')?.getContext('2d');
        if(c && highs.length){
          const W=100, H=30, minV = Math.min(...highs), maxV = Math.max(...highs);
          c.clearRect(0,0,W,H);
          c.strokeStyle = '#ffd54f'; c.lineWidth=2; c.beginPath();
          highs.forEach((v,i) => {
            const x = i*(W/(highs.length-1));
            const y = H - (v-minV)/(maxV-minV)*H;
            i===0?c.moveTo(x,y):c.lineTo(x,y);
          });
          c.stroke();
        }

        if(tM)    document.getElementById('w-temp').textContent = tM[1]+'°F';
        if(hM)    document.getElementById('w-hum').textContent  = hM[1]+'%';
        if(rainM) document.getElementById('w-rain').textContent = rainM[1]+'%';
        if(windM) document.getElementById('w-wind').textContent = windM[1].trim();
        if(foreM){
          let f = foreM[1].trim().replace(/(Chance)\s+(Showers.*Thunderstorms)/i,'$1 of $2');
          f = f.charAt(0).toUpperCase()+f.slice(1).toLowerCase();
          document.getElementById('w-forecast').textContent = f + '.';
        }
        if(maxM)  document.getElementById('w-max').textContent  = maxM[1]+'°F';
        if(minM)  document.getElementById('w-min').textContent  = minM[1]+'°F';
      }

      // Surf Forecast
      if (document.getElementById('surf-forecast')) {
        const start = L.findIndex(l => l.startsWith('Southern Brevard Barrier Islands'));
        let end    = L.findIndex((l,i) => i>start && l.includes('Sunset'));
        if(end===-1) end=L.length;
        const S = start>-1 ? L.slice(start,end+1) : [];

        const ripL  = S.find(l=>l.startsWith('Rip Current Risk'))     || '';
        const surfL = S.find(l=>l.startsWith('Surf Height'))         || '';
        const thL   = S.find(l=>l.includes('Thunderstorm Potential'))|| '';
        const uvL   = S.find(l=>l.startsWith('UV Index'))            || '';
        const srL   = S.find(l=>l.trim().startsWith('Sunrise'))      || '';
        const ssL   = S.find(l=>l.trim().startsWith('Sunset'))       || '';

        const ripM  = ripL.match(/Rip Current Risk.*?([A-Za-z ]+)/);
        const surfM = surfL.match(/Around\s*([\d\s\w]+)/);
        const thM   = thL.match(/Thunderstorm Potential.*?([A-Za-z]+)/);
        const srM   = srL.match(/Sunrise.*?(\d{1,2}:\d{2}\s?(?:AM|PM))/);
        const ssM   = ssL.match(/Sunset.*?(\d{1,2}:\d{2}\s?(?:AM|PM))/);

        const thunderMap = { Low:'Low chance', Moderate:'Moderate chance', High:'Very likely' };
        const uvColor    = { Low:'#00FF00', Moderate:'#FFFF00', High:'#FF0000','Very High':'#FF4500' };

        if(ripM){
          const lvl = ripM[1].trim();
          document.getElementById('s-risk').textContent = lvl;
          const iconMap = { Low:'green.flag.png', Moderate:'yellow.flag.png', High:'red.flag.png', Extreme:'doublered.flag.png', 'Dangerous Marine Life':'purple.flag.png' };
          document.getElementById('s-risk-img-large').src = 'images/flags/'+(iconMap[lvl]||'green.flag.png');
        }
        if(surfM) document.getElementById('s-height').textContent    = surfM[1].trim();
        if(thM)   document.getElementById('s-thunder').textContent   = thunderMap[thM[1]]||thM[1];

        const uvCat = uvL.match(/UV Index.*?([A-Za-z ]+)/)?.[1].trim() || 'Very High';
        const uvP = document.getElementById('s-uv-pill');
        uvP.textContent   = uvCat;
        uvP.style.background = uvColor[uvCat] || '#777';

        if(srM) document.getElementById('s-sunrise').textContent  = srM[1];
        if(ssM) document.getElementById('s-sunset').textContent   = ssM[1];
      }

      // Tide Times
      if (document.getElementById('tide-times')) {
        const zoneID = 'Coastal Indian River-Mainland Southern Brevard';
        const start  = L.findIndex(l => l.includes(zoneID));
        if(start>-1){
          let end = L.findIndex((l,i) => i>start && l.trim()==='&&');
          if(end===-1) end=L.length;
          const Z = L.slice(start,end);

          const pHigh = Z.filter(l=>l.includes('Port Canaveral')&&/High/i.test(l)).map(l=>l.trim());
          const pLow  = Z.filter(l=>l.includes('Port Canaveral')&&/Low /i.test(l)).map(l=>l.trim());
          const portLines = pHigh.length ? [...pHigh,...pLow] : (pLow[0]?[pLow[0]]:[]);
          if(portLines.length) document.getElementById('tide-port').innerHTML = portLines.join('<br>');

          const sHigh = Z.filter(l=>l.includes('Sebastian Inlet')&&/High/i.test(l)).map(l=>l.trim());
          const sLow  = Z.filter(l=>l.includes('Sebastian Inlet')&&/Low /i.test(l)).map(l=>l.trim());
          const sebLines = sHigh.length ? [...sHigh,...sLow] : (sLow[0]?[sLow[0]]:[]);
          if(sebLines.length) document.getElementById('tide-seb').innerHTML = sebLines.join('<br>');
        }
      }

      // Tip of the Day
if (document.getElementById('plan-tip-text')) {
  let tip = 'Have a great day!';
  const thunderText = document.getElementById('s-thunder')?.textContent;
  const rainLine    = L.find(l => l.startsWith('• Today:'));
  const rainMatch   = rainLine?.match(/Rain: (\d+)%/);

  if (thunderText === 'Very likely') {
    tip = 'Afternoon storms likely—plan indoor activities or carry rain gear.';
  } else if (rainMatch && +rainMatch[1] > 50) {
    tip = 'High chance of rain—don’t forget your umbrella.';
  }

  // updated UV logic:
  const uvText = document.getElementById('s-uv-pill')?.textContent || '';
  if (uvText === 'Very High' || uvText === 'Extreme') {
    tip = 'UV is very high—apply sunscreen and wear a hat.';
  }

  const rf = document.getElementById('s-risk')?.textContent;
  if (rf === 'High' || rf === 'Extreme') {
    tip = 'Rip currents are dangerous—avoid swimming today.';
  }

  document.getElementById('plan-tip-text').textContent = tip;
}

  // Slideshow
  if (document.querySelector('.slideshow')) {
    const files = [
      '1.png','2.png','5.png','6.png','7.png',
      'Climate.png','Forecast.png','KMLB_loop.gif'
    ];
    const base  = 'images/';
    const cont  = document.querySelector('.slideshow');
    const slides = [];
    let idx = 0, started = false;

    files.forEach(name => {
      const img = new Image();
      img.src = base + name;
      img.onload = () => {
        img.classList.add('slide');
        cont.appendChild(img);
        slides.push(img);
        if (!started) {
          started = true;
          slides[0].classList.add('active');
          setInterval(() => {
            slides[idx].classList.remove('active');
            idx = (idx + 1) % slides.length;
            slides[idx].classList.add('active');
          }, 10000);
        }
      };
    });
  }
});

