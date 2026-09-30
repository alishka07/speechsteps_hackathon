/** Three small camera articulation games, confined to the hackathon route. */
export function speechGarden(): string {
  return `
    var GARDEN = [
      { id:'smile-flower', shape:'smile', sound:'И', x:-2, z:0, color:0xE79CB8, threshold:0.42,
        title:'Разбуди цветок', hint:'Улыбнись и скажи «И» обычным голосом.', help:'Помочь цветку',
        navigation:'Иди к розовому цветку по светлячкам.', reward:'Цветок проснулся!' },
      { id:'round-fish', shape:'round', sound:'У', x:3, z:-5, color:0x6CCBD4, threshold:0.40,
        title:'Пузыри для рыбки', hint:'Собери губы в трубочку и скажи «У».', help:'Помочь рыбке',
        navigation:'Следуй за светлячками к маленькому пруду.', reward:'Рыбка играет с пузырями!' },
      { id:'open-lantern', shape:'open', sound:'А', x:5, z:4, color:0xF2C364, threshold:0.38,
        title:'Зажги фонарик', hint:'Мягко открой рот и скажи «А».', help:'Зажечь фонарик',
        navigation:'Найди золотой фонарик по светлячкам.', reward:'Остров сияет!' }
    ];
    var gardenObjects = [], gardenTrail = [], gardenIndex = -1, gardenBlocked = -1;
    var gardenReps = [[],[],[]], gardenHold = 0, gardenRest = 0, gardenNeedRest = false;
    var gardenSerial = -1, gardenSampleAt = 0, gardenCelebrate = 0, gardenClock = 0;
    var gardenHint = '', gardenLastText = '', gardenLastManual = false;
    var gardenEl = document.getElementById('garden'), gardenHelp = document.getElementById('gardenHelp');
    var gardenFill = document.getElementById('gardenFill'), gardenStatus = document.getElementById('gardenStatus');
    var gardenRetry = document.getElementById('gardenRetry');

    function gardenActive(){ return !!CFG.demoOnly && gardenIndex >= 0; }
    function gardenCameraMode(){ return gardenActive() && gardenCelebrate <= 0; }
    function gardenStatusHint(){ return gardenActive() ? gardenHint : null; }
    function gardenFocus(){ return gardenActive() ? { x:GARDEN[gardenIndex].x, y:1.25, z:GARDEN[gardenIndex].z } : null; }
    function gardenResults(){
      var results = [];
      gardenReps.forEach(function(reps, i){
        if (reps.length === 2) results.push({ id:GARDEN[i].id,
          source:reps[0] === reps[1] ? reps[0] : 'mixed', repetitions:2 });
      });
      return results;
    }
    function gardenComplete(){ return !!CFG.demoOnly && gardenResults().length === 3 && gardenIndex < 0; }
    function gardenNext(){ for(var i=0;i<3;i++) if(gardenReps[i].length<2) return i; return -1; }
    function gardenObjective(){
      if (!CFG.demoOnly) return;
      var i = gardenIndex >= 0 ? gardenIndex : gardenNext();
      if (i < 0){ setObj('Сад звуков ожил · 3/3', 'Цветок, рыбка и фонарик благодарят тебя!'); return; }
      setObj('Сад звуков · ' + gardenResults().length + '/3', gardenActive() ? GARDEN[i].title + ' · «' + GARDEN[i].sound + '»' : GARDEN[i].navigation);
    }
    function gardenSetStatus(text){
      gardenHint = text;
      if (gardenLastText !== text){ gardenStatus.textContent = text; gardenLastText = text; }
    }
    function gardenPause(){
      gardenHold=0; gardenRest=0; gardenSampleAt=0; gardenSerial=faceFrameSerial;
      if (gardenActive() && !gardenCelebrate) gardenSetStatus('Продолжим, когда будешь готов.');
    }
    function gardenCloseTask(cancelled){
      if (gardenIndex < 0) return;
      if (cancelled) gardenBlocked=gardenIndex;
      gardenIndex=-1; gardenCelebrate=0; gardenPause();
      gardenEl.style.display='none'; document.getElementById('worldBody').classList.remove('garden-open');
      clearInput(); clearFinger(); canvas.focus({preventScroll:true});
      gardenObjective();
    }
    function gardenMouth(shape){
      var mouth = shape === 'smile' ? '<path d="M23 45 Q40 61 57 45 Q40 49 23 45" fill="#FFFFFF" stroke="#86678B" stroke-width="2.5"/>' :
        shape === 'round' ? '<ellipse cx="40" cy="48" rx="8" ry="11" fill="#A66582" stroke="#D88499" stroke-width="4"/>' :
        '<ellipse cx="40" cy="47" rx="12" ry="15" fill="#88597C"/><path d="M32 57 Q40 49 48 57" fill="#E9A2B6"/>';
      return '<svg viewBox="0 0 80 80" role="img" aria-label="' + (shape === 'smile' ? 'Улыбка' : shape === 'round' ? 'Губы трубочкой' : 'Открытый рот') + '"><circle cx="40" cy="40" r="35" fill="#F7DFCA"/><path d="M21 24 Q27 19 32 23 M48 23 Q54 19 59 24" fill="none" stroke="#86678B" stroke-width="2.5" stroke-linecap="round"/><circle cx="27" cy="32" r="3" fill="#5C526F"/><circle cx="53" cy="32" r="3" fill="#5C526F"/><ellipse cx="20" cy="44" rx="6" ry="3" fill="#EDB6BC"/><ellipse cx="60" cy="44" rx="6" ry="3" fill="#EDB6BC"/>' + mouth + '</svg>';
    }
    function gardenPaintProgress(){
      if (gardenIndex<0) return;
      var reps=gardenReps[gardenIndex], complete=reps.length===2;
      document.getElementById('gardenCount').textContent = complete ? 'Два повтора · готово' : 'Повтор ' + (reps.length+1) + ' из 2';
      document.getElementById('gardenGem1').classList.toggle('earned', reps.length>0);
      document.getElementById('gardenGem2').classList.toggle('earned', complete);
      var fill=complete ? 1 : gardenNeedRest ? clamp01(gardenRest/0.3) : clamp01(gardenHold/0.6);
      gardenFill.style.width=Math.round(fill*100)+'%';
      document.getElementById('gardenMeter').setAttribute('aria-valuenow', Math.round(fill*100));
      document.getElementById('gardenMeter').setAttribute('aria-label', gardenNeedRest ? 'Пауза между повторами' : 'Движение губ');
      gardenHelp.disabled=complete;
    }
    function gardenOpenTask(i){
      gardenIndex=i; gardenCelebrate=0; gardenLastManual=false;
      gardenHold=gardenRest=0; gardenNeedRest=gardenReps[i].length>0;
      gardenSerial=faceFrameSerial; gardenSampleAt=0;
      clearInput(); clearFinger(); resetCoach();
      var s=GARDEN[i];
      document.getElementById('gardenTitle').textContent=s.title;
      document.getElementById('gardenInstruction').textContent=s.hint;
      document.getElementById('gardenSound').textContent=s.sound;
      document.getElementById('gardenExample').innerHTML=gardenMouth(s.shape);
      gardenHelp.textContent=s.help;
      gardenEl.style.display='block'; document.getElementById('worldBody').classList.add('garden-open');
      gardenEl.classList.remove('garden-success');
      gardenSetStatus('Повтори движение два раза. Не спеши.');
      gardenPaintProgress(); gardenObjective();
      setMood('listen',3); speak(s.hint+' Повторим два раза, с маленькой паузой.');
      if (cameraConnected()) initFace();
    }
    function gardenReward(source){
      if (!gardenActive() || gardenCelebrate>0 || gardenReps[gardenIndex].length>=2) return;
      gardenReps[gardenIndex].push(source); gardenHold=gardenRest=0; gardenSampleAt=0;
      gardenSerial=faceFrameSerial; gardenLastManual=source==='manual';
      gardenNeedRest=true;
      if (gardenReps[gardenIndex].length===2){
        gardenCelebrate=1.8; gardenEl.classList.add('garden-success');
        gardenSetStatus(GARDEN[gardenIndex].reward);
        setMood('happy',2); chime();
        speak(GARDEN[gardenIndex].reward);
      } else {
        tone(660,0.18,'sine',0.055);
        gardenSetStatus(source==='manual' ? 'Помощь кнопкой · первый повтор. Ещё один!' : 'Получилось! Расслабь губы — и ещё раз.');
      }
      gardenPaintProgress();
    }
    gardenHelp.addEventListener('click',function(){
      if (!CFG.demoOnly || (typeof gamePaused !== 'undefined' && gamePaused)) return;
      gardenReward('manual');
    });
    document.getElementById('gardenClose').addEventListener('click',function(){ gardenCloseTask(true); });
    gardenRetry.addEventListener('click',function(){
      if (!gardenActive() || (typeof gamePaused !== 'undefined' && gamePaused)) return;
      gardenPause(); retryFace(); gardenSetStatus('Подключаем распознавание лица…');
    });
    window.addEventListener('keydown',function(event){
      if (event.code==='Escape' && gardenActive() && !gardenCelebrate){ event.preventDefault(); gardenCloseTask(true); }
    });

    function gardenMakeStation(s,i){
      var root=grp(s.x,0,s.z), accent=matOwn(s.color,{roughness:0.7,emissive:s.color,emissiveIntensity:0.04});
      var ring=at(torus(1.8,0.045,48,basicOwn(s.color,{transparent:true,opacity:0.6})),0,0.09,0);
      ring.rotation.x=-Math.PI/2; root.add(ring);
      var rune=at(new THREE.Mesh(new THREE.OctahedronGeometry(0.16),matOwn(0xFFE7A0,{emissive:0xFFD977,emissiveIntensity:0.5})),0,3.1,0);
      root.add(rune);
      var o={root:root,ring:ring,rune:rune,accent:accent,petals:[],bubbles:[],amount:0};
      if(i===0){
        root.add(at(shade(cyl(0.1,0.14,1.35,8,0x60977A)),0,0.68,0));
        [-1,1].forEach(function(side){var leaf=at(shade(sph(0.4,0x91BD92,0,8)),side*0.28,0.7,0);leaf.scale.set(1.15,0.24,0.5);leaf.rotation.z=side*0.45;root.add(leaf);});
        for(var p=0;p<7;p++){
          var petal=shade(sph(0.46,accent,0,10));petal.scale.set(0.72,0.28,1.15);root.add(petal);o.petals.push(petal);
        }
        o.heart=at(shade(sph(0.33,matOwn(0xEFC35D,{emissive:0xF7C260,emissiveIntensity:0.1}),0,12)),0,1.6,0);root.add(o.heart);
        o.glow=at(glowSprite(0xFFD576,2.8,0),0,1.8,0);root.add(o.glow);
      } else if(i===1){
        root.add(at(shade(cyl(1.35,1.5,0.22,20,0xB9C4B6)),0,0.12,0));
        var pond=at(cyl(1.25,1.25,0.035,32,matOwn(0x70C9D9,{roughness:0.17,metalness:0.15,emissive:0x3091B2,emissiveIntensity:0.05})),0,0.25,0);root.add(pond);o.pond=pond;
        for(var k=0;k<9;k++){var a=k/9*Math.PI*2;var rock=at(shade(sph(0.26,0xCED6C4,{flatShading:true},6)),Math.cos(a)*1.4,0.23,Math.sin(a)*1.4);rock.scale.y=0.6;root.add(rock);}
        o.fish=grp(0,0.34,0);var body=sph(0.34,0xEAAF75,{flatShading:true},10);body.scale.set(1.3,0.7,0.7);o.fish.add(body);
        var tail=at(cone(0.27,0.38,3,0xEBC17C),-0.49,0,0);tail.rotation.z=-Math.PI/2;tail.scale.z=0.45;o.fish.add(tail);
        [-1,1].forEach(function(side){o.fish.add(at(sph(0.065,0xFFFFFF,0,8),0.2,0.08,side*0.2));o.fish.add(at(sph(0.034,0x4F5866,0,8),0.23,0.08,side*0.245));});
        root.add(o.fish);
        for(var b=0;b<8;b++){
          var bubble=sph(0.12+(b%3)*0.06,matOwn(0xC6F2FF,{transparent:true,opacity:0.5,roughness:0.1,metalness:0.05}),0,12);
          bubble.add(at(sph(0.035,basic(0xFFFFFF),0,6),-0.05,0.06,0.07));root.add(bubble);o.bubbles.push(bubble);
        }
      } else {
        root.add(at(shade(cyl(0.85,1,0.28,8,0xB4C1B8)),0,0.15,0));
        root.add(at(shade(cyl(0.12,0.18,1,8,0x9E805A)),0,0.8,0));
        root.add(at(shade(cyl(0.61,0.54,0.14,6,0xA8906A)),0,1.25,0));
        var glass=at(cyl(0.48,0.48,0.9,6,mat(0xEBE3B8,{transparent:true,opacity:0.3,roughness:0.2,depthWrite:false})),0,1.75,0);root.add(glass);
        for(var l=0;l<6;l++){var ang=l/6*Math.PI*2;root.add(at(shade(cyl(0.035,0.035,1,5,0xA8906A)),Math.cos(ang)*0.51,1.75,Math.sin(ang)*0.51));}
        root.add(at(shade(cone(0.75,0.5,6,0x759DA1)),0,2.42,0));
        root.add(at(sph(0.09,0xD5B775,0,8),0,2.72,0));
        o.flame=at(sph(0.27,matOwn(0xCFBC93,{emissive:0xFFC661,emissiveIntensity:0}),0,10),0,1.75,0);o.flame.scale.y=1.3;root.add(o.flame);
        o.glow=at(glowSprite(0xFFD075,3.8,0),0,1.75,0);root.add(o.glow);
        o.light=new THREE.PointLight(0xFFD386,0,6,2);o.light.position.set(0,1.9,0);root.add(o.light);
      }
      scene.add(root);gardenObjects.push(o);
    }
    if(CFG.demoOnly){
      GARDEN.forEach(gardenMakeStation);
      for(var gp=0;gp<12;gp++){
        var mote=sph(0.065,basic(0xFFECA4),0,6);scene.add(mote);gardenTrail.push(mote);
      }
    }
    function gardenAnimate(dt){
      gardenClock+=dt;var next=gardenNext();
      gardenObjects.forEach(function(o,i){
        var desired=gardenReps[i].length/2;
        if(i===gardenIndex&&!gardenNeedRest) desired=Math.max(desired,(gardenReps[i].length+gardenHold/0.6)/2);
        o.amount=ease(o.amount,desired,4,dt);
        o.ring.material.opacity=i===next ? 0.6+Math.sin(gardenClock*3)*0.18 : 0.12;
        o.rune.visible=i===next; o.rune.position.y=3+Math.sin(gardenClock*2.4)*0.16;o.rune.rotation.y+=dt;
        if(i===0){
          o.petals.forEach(function(p,j){var a=j/7*Math.PI*2;var radius=0.16+o.amount*0.5;p.position.set(Math.cos(a)*radius,1.63+(1-o.amount)*0.32,Math.sin(a)*radius);p.rotation.set((1-o.amount)*0.65,a,0);});
          o.heart.material.emissiveIntensity=0.08+o.amount*0.5;o.glow.material.opacity=o.amount*0.28;
        } else if(i===1){
          var swim=gardenClock*(0.3+o.amount*1.2);o.fish.position.set(Math.cos(swim)*0.5*o.amount,0.34+Math.sin(swim*2)*0.06*o.amount,Math.sin(swim)*0.5*o.amount);o.fish.rotation.y=-swim-Math.PI/2;
          o.bubbles.forEach(function(b,j){var cycle=(gardenClock*(0.3+o.amount*0.4)+j/8)%1;b.visible=o.amount>0.05&&j<Math.ceil(o.amount*8);b.position.set(Math.sin(j*4.7)*0.8+Math.sin(gardenClock+j)*0.12,0.4+cycle*1.8,Math.cos(j*2.7)*0.7);b.material.opacity=(1-cycle)*0.55;});
        } else {o.flame.material.emissiveIntensity=o.amount*(1.8+Math.sin(gardenClock*5)*0.2);o.glow.material.opacity=o.amount*0.65;o.light.intensity=o.amount*1.5;}
      });
      gardenTrail.forEach(function(p,i){
        p.visible=next>=0&&!gardenActive();if(!p.visible)return;
        var s=GARDEN[next],u=((i/12+gardenClock*0.12)%1)*0.85+0.08;
        p.position.set(player.position.x+(s.x-player.position.x)*u,0.22+Math.sin(u*Math.PI)*0.18,s.z*u+player.position.z*(1-u));
      });
    }
    function gardenReset(){
      gardenReps=[[],[],[]];gardenIndex=-1;gardenBlocked=-1;gardenCelebrate=0;gardenNeedRest=false;gardenLastManual=false;
      gardenPause();gardenEl.style.display='none';document.getElementById('worldBody').classList.remove('garden-open');
      gardenObjects.forEach(function(o){o.amount=0;});
      if(CFG.demoOnly) gardenAnimate(0);
    }
    function gardenTick(dt){
      if(!CFG.demoOnly)return;
      gardenAnimate(dt);
      if(!gardenActive()){
        var next=gardenNext();if(next<0)return;
        var target=GARDEN[next],distance=dist(player.position.x,player.position.z,target.x,target.z);
        if(gardenBlocked===next && distance>3.25)gardenBlocked=-1;
        if(gardenBlocked!==next&&distance<2.5&&player.position.y<0.05&&!jumping)gardenOpenTask(next);
        return;
      }
      if(gardenCelebrate>0){gardenCelebrate-=dt;if(gardenCelebrate<=0)gardenCloseTask(false);return;}
      var s=GARDEN[gardenIndex];
      var fresh=readFace();
      gardenRetry.style.display=faceFailed&&cameraConnected()?'inline-flex':'none';
      if(!cameraConnected()){
        gardenHold=gardenRest=0;gardenSampleAt=0;
        gardenSetStatus(gardenLastManual ? 'Помощь кнопкой · первый повтор. Ещё один!' : 'Включи камеру справа или помоги кнопкой.');
      } else if(faceFailed){
        gardenHold=gardenRest=0;gardenSampleAt=0;gardenSetStatus('Лицо пока не распознаётся. Повтори загрузку или помоги кнопкой.');
      } else if(faceLoading || (typeof camState !== 'undefined' && camState==='loading')){
        gardenSetStatus('Готовим зеркало… Можно уже повторять за примером.');
      } else if(!fresh||!faceSeen||performance.now()-faceFreshAt>350){
        gardenHold=gardenRest=0;gardenSampleAt=0;gardenSetStatus('Покажи лицо камере. Держись свободно, без усилия.');
      } else if(faceFrameSerial!==gardenSerial){
        var previous=gardenSampleAt;gardenSerial=faceFrameSerial;gardenSampleAt=faceFreshAt;
        var gap=previous>0?faceFreshAt-previous:0;
        if(gap>300){gardenHold=0;gardenRest=0;}
        var sampleDt=previous>0&&gap<=300?Math.max(0,Math.min(0.1,gap/1000)):0;
        if(gardenNeedRest){
          var relaxed=Math.max(faceSignal('smile'),faceSignal('round'),faceSignal('open'))<0.26;
          gardenRest=relaxed?gardenRest+sampleDt:0;
          gardenSetStatus('Теперь расслабь губы. Маленькая пауза…');
          if(gardenRest>=0.3){gardenNeedRest=false;gardenRest=0;gardenSetStatus('Отлично! Повтори ещё раз.');}
        } else {
          var matches=faceSignal(s.shape)>=s.threshold;
          gardenHold=matches?gardenHold+sampleDt:0;
          gardenSetStatus(matches?'Вижу движение! Ещё чуть-чуть…':s.hint);
          if(gardenHold>=0.6)gardenReward('camera');
        }
      }
      gardenPaintProgress();
    }
`;
}
