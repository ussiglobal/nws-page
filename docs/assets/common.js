document.addEventListener('DOMContentLoaded', () => {
  fetch('./data/melbourne_fl_summary.txt')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(txt => {
      const L = txt.split('\n');

      // — Date & Last Updated —
      const dateEl = document.getElementById('current-date');
      if (dateEl) {
        const now = new Date();
        dateEl.textContent = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
      }
      const gen = L.find(l => l.startsWith('Generated:'));
      if (gen) {
        const upd = document.getElementById('last-updated');
        if (upd) upd.textContent = gen.replace('Generated:','').trim();
      }

      // — Current Weather —
      if (document.getElementById('w-temp')) {
        const curr    = L.find(l => l.startsWith('Temp:'))    || '';
        const tM      = curr.match(/Temp: ([\d.]+)°F/);
        const hM      = curr.match(/Humidity: ([\d.]+)%/);
        const today   = L.find(l => l.startsWith('• Today:'))|| '';
        const rainM   = today.match(/Rain: (\d+)%/);
        const windM   = today.match(/Wind: ([^;]+)/);
        const foreM   = today.match(/—\s*([^.;]+)/);
        const maxM    = today.match(/High: (\d+)°F/);
        const tonight = L.find(l => l.startsWith('• Tonight:'))|| '';
        const minM    = tonight.match(/Low: (\d+)°F/);

        // sparkline
        const tomM = (L.find(l=>l.startsWith('• Tomorrow:'))||'')
                     .match(/High: (\d+)°F/);
        const highs = [maxM&&+maxM[1], minM&&+minM[1], tomM&&+tomM[1]].filter(v=>v!=null);
        const c = document.getElementById('temp-sparkline');
        if (c?.getContext) {
          const ctx = c.getContext('2d'), W=100, H=30;
          const minV = Math.min(...highs), maxV = Math.max(...highs);
          ctx.clearRect(0,0,W,H);
          ctx.strokeStyle = '#ffd54f';
          ctx.lineWidth   = 2;
          ctx.beginPath();
          highs.forEach((v,i) => {
            const x = i*(W/(highs.length-1)),
                  y = H - (v-minV)/(maxV-minV)*H;
            i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
          });
          ctx.stroke();
        }

        if (tM)    document.getElementById('w-temp').textContent = tM[1]+'°F';
        if (hM)    document.getElementById('w-hum').textContent  = hM[1]+'%';
        if (rainM) document.getElementById('w-rain').textContent = rainM[1]+'%';
        if (windM) document.getElementById('w-wind').textContent = windM[1].trim();
        if (foreM) {
          let f = foreM[1].trim()
                   .replace(/(Chance)\s+(Showers.*Thunderstorms)/i,'$1 of $2');
          f = f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
          document.getElementById('w-forecast').textContent = f + '.';
        }
        if (maxM) {
          const ex = +maxM[1], cur = tM ? +tM[1] : ex;
          document.getElementById('w-max').textContent = Math.max(cur,ex)+'°F';
        }
        if (minM) {
          const ex = +minM[1], cur = tM ? +tM[1] : ex;
          document.getElementById('w-min').textContent = Math.min(cur,ex)+'°F';
        }
      }

      // — Surf Forecast & Flag —
      if (document.getElementById('s-risk')) {
        const s0 = L.findIndex(l => l.startsWith('Southern Brevard Barrier Islands'));
        let s1 = L.findIndex((l,i) => i > s0 && l.includes('Sunset'));
        if (s1 === -1) s1 = L.length;
        const S = s0 > -1 ? L.slice(s0, s1+1) : [];
        const ripL  = S.find(l => l.startsWith('Rip Current Risk'))     || '';
        const surfL = S.find(l => l.startsWith('Surf Height'))           || '';
        const thL   = S.find(l => l.includes('Thunderstorm Potential'))  || '';
        const uvL   = S.find(l => l.startsWith('UV Index'))              || '';
        const srL   = S.find(l => l.trim().startsWith('Sunrise'))        || '';
        const ssL   = S.find(l => l.trim().startsWith('Sunset'))         || '';
        const ripM  = ripL.match(/Rip Current Risk.*?([A-Za-z ]+)/);
        const surfM = surfL.match(/Around\s*([\d\s\w]+)/);
        const thM   = thL.match(/Thunderstorm Potential.*?([A-Za-z]+)/);
        const srM   = srL.match(/Sunrise.*?(\d{1,2}:\d{2}\s?(?:AM|PM))/);
        const ssM   = ssL.match(/Sunset.*?(\d{1,2}:\d{2}\s?(?:AM|PM))/);
        const thunderMap = { Low:'Low chance', Moderate:'Moderate chance', High:'Very likely' };
        const uvColor    = { Low:'#00FF00', Moderate:'#FFFF00', High:'#FF0000', 'Very High':'#FF4500' };
        const iconMap    = { Low:'green.flag.png', Moderate:'yellow.flag.png', High:'red.flag.png', 'Dangerous Marine Life':'purple.flag.png' };

        if (ripM) {
          const lvl = ripM[1].trim();
          document.getElementById('s-risk').textContent = lvl;
          document.getElementById('s-risk-img-large').src =
            './images/flags/'+(iconMap[lvl]||'green.flag.png');
        }
        if (surfM) document.getElementById('s-height').textContent = surfM[1].trim();
        if (thM)   document.getElementById('s-thunder').textContent = thunderMap[thM[1]]||thM[1];
        let uvCat = uvL.match(/UV Index.*?([A-Za-z ]+)/)
                    ? uvL.match(/UV Index.*?([A-Za-z ]+)/)[1].trim()
                    : 'Very High';
        if (uvCat==='Extreme') uvCat='Very High';
        const uvP = document.getElementById('s-uv-pill');
        if (uvP) { uvP.textContent = uvCat; uvP.style.background = uvColor[uvCat]||'#777'; }
        if (srM) document.getElementById('s-sunrise').textContent = srM[1];
        if (ssM) document.getElementById('s-sunset').textContent = ssM[1];
      }

      // — Tide Times —
      if (document.getElementById('tide-port')) {
        const zid = 'Coastal Indian River-Mainland Southern Brevard';
        const z0  = L.findIndex(l=>l.includes(zid));
        if (z0 > -1) {
          let z1 = L.findIndex((l,i)=>i>z0 && l.trim()==='&&');
          if (z1===-1) z1=L.length;
          const Z = L.slice(z0, z1);
          const pH = Z.filter(l=>l.includes('Port Canaveral')&&/High/i.test(l)).map(l=>l.trim());
          const pL = Z.filter(l=>l.includes('Port Canaveral')&&/Low /i.test(l)).map(l=>l.trim());
          document.getElementById('tide-port').innerHTML =
            (pH.length?[...pH,...pL]:(pL[0]?[pL[0]]:[])).join('<br>');
          const sH = Z.filter(l=>l.includes('Sebastian Inlet')&&/High/i.test(l)).map(l=>l.trim());
          const sL = Z.filter(l=>l.includes('Sebastian Inlet')&&/Low /i.test(l)).map(l=>l.trim());
          document.getElementById('tide-seb').innerHTML =
            (sH.length?[...sH,...sL]:(sL[0]?[sL[0]]:[])).join('<br>');
        }
      }

      // — Tip of the Day —
      if (document.getElementById('plan-tip-text')) {
        let tip = 'Have a great day!';
        const thunderText = document.getElementById('s-thunder')?.textContent;
        const rainLine    = L.find(l=>l.startsWith('• Today:'));
        const rainMatch   = rainLine?.match(/Rain: (\d+)%/);
        if (thunderText==='Very likely') {
          tip = 'Afternoon storms likely—plan indoor activities or carry rain gear.';
        } else if (rainMatch && +rainMatch[1]>50) {
          tip = 'High chance of rain—don’t forget your umbrella.';
        }
        const uvText = document.getElementById('s-uv-pill')?.textContent;
        if (uvText==='Very High') {
          tip = 'UV is very high—apply sunscreen and wear a hat.';
        }
        const rf = document.getElementById('s-risk')?.textContent;
        if (rf==='High' || rf==='Extreme') {
          tip = 'Rip currents are dangerous—avoid swimming today.';
        }
        document.getElementById('plan-tip-text').textContent = tip;
      }
    })
    .catch(console.error);
});

