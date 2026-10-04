// Dedicated synthetic production probe; keep other builds/tests idle while measuring.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const [base, output, sizes = '5000', trialsText = '5'] = process.argv.slice(2);
if (!base || !output || !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(base)) throw new Error('Usage: node src/tests/performance/audit-history.mjs http://127.0.0.1:PORT OUTPUT [5000|0,1000,5000] [5]');
const trials = Number(trialsText);
const counts = sizes.split(',').map(Number);
if (!Number.isSafeInteger(trials) || trials < 1 || counts.some(count => !Number.isSafeInteger(count) || count < 0)) throw new Error('Fixture sizes must be nonnegative integers and trials a positive integer.');
await fs.mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { browser: browser.version(), platform: process.platform, osRelease: os.release(), cpu: os.cpus()[0]?.model, logicalProcessors: os.cpus().length, memoryBytes: os.totalmem(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, viewport: '1440x1000', warmups: 1, node: process.version, base, trials, sessions: [] };
const median = a => [...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
try {
  for (const count of counts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', serviceWorkers: 'block' });
    await context.addInitScript(() => {
      globalThis.historyTasks = [];
      globalThis.historyGaps = [];
      new PerformanceObserver(list => globalThis.historyTasks.push(...list.getEntries().map(e=>({ start:e.startTime, duration:e.duration })))).observe({ type: 'longtask', buffered: true });
      let previous = performance.now();
      function frame() { const now=performance.now(); globalThis.historyGaps.push(now-previous); previous=now; requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByTestId('progress-loading-state').waitFor({ state: 'hidden', timeout: 60000 });
    await page.evaluate(async count => {
      const database = await new Promise((resolve,reject) => { const request=indexedDB.open('consulting_math_drill_tool'); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); });
      const stores=['drill_sessions','responses','benchmark_results','practice_records','exhibit_attempts','market_sizing_attempts','mistake_notebook','retry_schedules'];
      const transaction=database.transaction(stores,'readwrite');
      const done=new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});
      for (const store of stores) transaction.objectStore(store).clear();
      for (let n=0;n<count;n++) {
        const id=`history-${String(n).padStart(5,'0')}`;
        const startedAt=new Date(Date.UTC(2024,0,1)+n*3600000).toISOString();
        const endedAt=new Date(Date.parse(startedAt)+200000).toISOString();
        const questions=Array.from({length:20},(_,j)=>({id:`question-${j}`,type:'numeric',category:'arithmetic',tags:['addition'],difficulty:'beginner',prompt:`What is ${j+10} + 20?`,answer:{value:j+30,unit:'none'},explanation:{short:'Add the two values.',steps:[`${j+10} + 20 = ${j+30}.`]},metadata:{sourceType:'generated'}}));
        const responses=questions.map((q,j)=>({questionId:q.id,rawInput:String(q.answer.value+(j%5===0?1:0)),normalizedValue:q.answer.value+(j%5===0?1:0),isCorrect:j%5!==0,errorTypes:j%5===0?['arithmetic_error']:['none'],timeTakenSeconds:10,submittedAt:new Date(Date.parse(startedAt)+(j+1)*10000).toISOString()}));
        const score={totalScore:1600,accuracy:.8,averageTimeSeconds:10,correctCount:16,incorrectCount:4,categoryBreakdown:[],errorBreakdown:[]};
        transaction.objectStore('drill_sessions').put({id,startedAt,endedAt,updatedAt:endedAt,settings:{categories:['arithmetic'],difficulty:'beginner',questionCount:20,timeMode:'untimed',feedbackMode:'instant'},questionIds:questions.map(q=>q.id),questions,responses,score});
        for (const response of responses) transaction.objectStore('responses').put({...response,id:`${id}:${response.questionId}`,sessionId:id,category:'arithmetic',tags:['addition']});
        if (n%10===0) {
          transaction.objectStore('benchmark_results').put({id:`benchmark-${n}`,sessionId:id,benchmarkId:'synthetic-benchmark',difficulty:'beginner',completedAt:endedAt,score,...(n%20===0?{timingAccommodation:'double_time'}:{})});
          transaction.objectStore('practice_records').put({id:`case-${n}`,kind:'attempt',module:'questioning',itemId:'synthetic-case',completedAt:endedAt,score:70,maxScore:85});
          transaction.objectStore('exhibit_attempts').put({id:`exhibit-${n}`,exhibitId:'synthetic-exhibit',startedAt,completedAt:endedAt,score:75,isCorrect:false});
          transaction.objectStore('market_sizing_attempts').put({id:`sizing-${n}`,templateId:'synthetic-sizing',startedAt,completedAt:endedAt,score:3,maxScore:4});
          const mistakeId=`mistake-${n}`;
          transaction.objectStore('mistake_notebook').put({id:mistakeId,sourceSessionId:id,sourceQuestionId:questions[0].id,sourceType:'drill',prompt:questions[0].prompt,answer:questions[0].answer,explanation:questions[0].explanation,category:'arithmetic',tags:['addition'],difficulty:'beginner',rawInput:'31',normalizedValue:31,errorTypes:['arithmetic_error'],missedAt:endedAt,retryCount:0,status:'unresolved'});
          transaction.objectStore('retry_schedules').put({id:`schedule-${n}`,sourceId:mistakeId,sourceType:'mistake_notebook',dueAt:endedAt,intervalDays:1,attemptCount:0,createdAt:endedAt,updatedAt:endedAt});
        }
      }
      await done;
      database.close();
    },count);
    const sample={ count, responses: count*20, additionalPerStore: Math.ceil(count/10), errors, routes: [] };
    report.sessions.push(sample);
    const client=await context.newCDPSession(page);
    for (const rate of [1,4]) {
      await client.send('Emulation.setCPUThrottlingRate',{rate});
      for (const route of ['/','/progress/']) {
        const measurements=[];
        for (let trial=-1;trial<trials;trial++) {
          await page.goto(base.replace(/\/$/,'')+route,{waitUntil:'domcontentloaded'});
          if (count>0) await page.getByTestId(route==='/'?'dashboard-priority-panel':'math-progress-detail').waitFor({timeout:120000});
          else await page.getByTestId('progress-loading-state').waitFor({state:'hidden',timeout:60000});
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const result=await page.evaluate(()=>{
            const gaps=[...globalThis.historyGaps].sort((a,b)=>a-b);
            return {readyMs:performance.now(),longestTaskMs:Math.max(0,...globalThis.historyTasks.map(t=>t.duration)),totalBlockingMs:globalThis.historyTasks.reduce((sum,t)=>sum+Math.max(0,t.duration-50),0),p95FrameGapMs:gaps[Math.floor(gaps.length*.95)]??0,maxFrameGapMs:Math.max(0,...gaps),heapBytes:performance.memory?.usedJSHeapSize};
          });
          if(trial>=0) measurements.push(result);
          console.log(JSON.stringify({count,route,rate,trial,...result}));
        }
        sample.routes.push({route,rate,measurements,medians:Object.fromEntries(['readyMs','longestTaskMs','totalBlockingMs','p95FrameGapMs','maxFrameGapMs'].map(key=>[key,median(measurements.map(item=>item[key]))]))});
        await fs.writeFile(output,JSON.stringify(report,null,2));
      }
    }
    await context.close();
  }
} finally { await fs.writeFile(output,JSON.stringify(report,null,2)); await browser.close(); }
