module.exports=[215880,771407,a=>{"use strict";let b=["30d","12m","all"];function c(a,b){return"30d"===a?{from:new Date(b.getTime()-2592e6),to:b}:"12m"===a?{from:function(a,b=0){let c=new Date(a.getTime()+252e5);return new Date(Date.UTC(c.getUTCFullYear(),c.getUTCMonth()-b,1)-252e5)}(b,11),to:b}:{from:null,to:b}}function d(a){let b=new Date(a.getTime()+252e5);return`${b.getUTCFullYear()}-${String(b.getUTCMonth()+1).padStart(2,"0")}`}function e(a,b){let c=[],[d,e]=a.split("-").map(Number),[f,g]=b.split("-").map(Number);for(;d<f||d===f&&e<=g;)c.push(`${d}-${String(e).padStart(2,"0")}`),(e+=1)>12&&(e=1,d+=1);return c}a.s(["E",0,"12m","a",0,b,"_",0,d,"J",0,e,"I",0,function(a){let c=Array.isArray(a)?a[0]:a;return b.includes(c??"")?c:"12m"},"Z",0,c],215880);var f=a.i(351674),g=a.i(148673),h=a.i(703213),i=a.i(337965),j=a.i(218143);async function k(a,b,c,k){let l=c.toISOString(),m=(0,j.s)(g.cases.createdAt,b),n=await (0,j.o)(a,f.B`select count(*)::int as n from ${g.cases} where service = 'complaint' and ${m}`),o=await (0,j.o)(a,f.B`select count(*)::int as n from ${g.cases} where service = 'complaint' and status = 'redirected' and ${m}`),p=k?await (0,j.J)(a,f.B`select to_char(${g.cases.createdAt} at time zone 'Asia/Bangkok', 'YYYY-MM') as month, count(*)::int as n
          from ${g.cases} where service = 'complaint' and ${m} group by 1 order by 1`):[],q=await (0,j.J)(a,f.B`select cat.key as key, cat.name_th as name_th, cat.name_en as name_en, cat.restricted as restricted, count(*)::int as n
      from ${h.complaintCases} cc
      inner join ${g.cases} on ${g.cases.id} = cc.case_id
      inner join ${h.complaintCategories} cat on cat.id = cc.category_id
      where ${m}
      group by cat.key, cat.name_th, cat.name_en, cat.restricted`),r=await (0,j.o)(a,f.B`select count(*)::int as base,
        (count(*) filter (where cc.acknowledged_at is not null and cc.acknowledged_at <= cc.acknowledge_due_at))::int as ok
      from ${h.complaintCases} cc inner join ${g.cases} on ${g.cases.id} = cc.case_id
      where ${m}
        and (cc.acknowledged_at is not null or (${g.cases.status} not in ('withdrawn', 'redirected') and cc.acknowledge_due_at < ${l}::timestamptz))`),s=await (0,j.o)(a,f.B`select count(*)::int as base,
        (count(*) filter (where cc.resolved_at is not null and cc.resolved_at <= cc.resolve_due_at))::int as ok
      from ${h.complaintCases} cc inner join ${g.cases} on ${g.cases.id} = cc.case_id
      where ${m}
        and (cc.resolved_at is not null or (${g.cases.status} not in ('withdrawn', 'redirected') and cc.resolve_due_at < ${l}::timestamptz))`),t=await (0,j.o)(a,f.B`select count(*)::int as n,
        (percentile_cont(0.5) within group (order by extract(epoch from (cc.resolved_at - ${g.cases.createdAt})) / 86400.0))::float8 as median
      from ${h.complaintCases} cc inner join ${g.cases} on ${g.cases.id} = cc.case_id
      where cc.resolved_at is not null and ${g.cases.status} <> 'redirected' and ${(0,j.s)(f.B`cc.resolved_at`,b)}`),u=await (0,j.o)(a,f.B`select count(*)::int as n, avg(${h.complaintSurveys.score})::float8 as mean,
        (count(*) filter (where ${h.complaintSurveys.score} >= 4))::int as satisfied
      from ${h.complaintSurveys} where ${(0,j.s)(h.complaintSurveys.createdAt,b)}`),v=await (0,j.o)(a,f.B`select count(*)::int as base, (count(*) filter (where cc.reopen_count > 0))::int as ok
      from ${h.complaintCases} cc inner join ${g.cases} on ${g.cases.id} = cc.case_id
      where ${m} and (cc.resolved_at is not null or cc.reopen_count > 0)`),w=await (0,j.o)(a,f.B`select count(*)::int as total,
        (count(*) filter (where not exists (
          select 1 from case_events e where e.case_id = ${g.cases.id} and e.type = 'created' and e.actor_user_id is not null
        )))::int as online
      from ${g.cases} where service = 'complaint' and ${m}`),x=(0,j.D)(t.median),y=(0,j.D)(u.mean);return{received:(0,i.A)((0,j.v)(n.n)),redirected:(0,i.A)((0,j.v)(o.n)),byMonth:k?function(a,b,c){let f=b.from?d(b.from):a[0]?.month;if(!f)return[];let g=e(f,d(c)).slice(-36),h=new Map(a.map(a=>[a.month,(0,j.v)(a.n)]));return g.map(a=>({month:a,received:(0,i.A)(h.get(a)??0)}))}(p,b,c):[],byCategory:(0,i.G)(q.map(a=>({key:a.key,nameTh:a.name_th,nameEn:a.name_en,restricted:a.restricted,n:(0,j.v)(a.n)}))),acknowledgedOnTime:(0,i.U)((0,j.v)(r.ok),(0,j.v)(r.base)),resolvedOnTime:(0,i.U)((0,j.v)(s.ok),(0,j.v)(s.base)),medianDaysToResolution:(0,i.L)((0,j.v)(t.n),null===x?null:(0,i.j)(x)),satisfactionMean:(0,i.L)((0,j.v)(u.n),null===y?null:(0,i.j)(y)),satisfiedShare:(0,i.U)((0,j.v)(u.satisfied),(0,j.v)(u.n)),reopenRate:(0,i.U)((0,j.v)(v.ok),(0,j.v)(v.base)),onlineShare:(0,i.U)((0,j.v)(w.online),(0,j.v)(w.total))}}var l=a.i(100619);async function m(a,b){let c=new Date(b.to.getTime()-2592e6).toISOString(),d=await (0,j.J)(a,f.B`select kind, count(*)::int as n from ${g.cases} where service = 'lost_found' and ${(0,j.s)(g.cases.createdAt,b)} group by kind`),e=a=>(0,j.v)(d.find(b=>b.kind===a)?.n),h=await (0,j.o)(a,f.B`select count(*)::int as n,
        (percentile_cont(0.5) within group (order by extract(epoch from (${g.cases.closedAt} - ${g.cases.createdAt})) / 86400.0))::float8 as median
      from ${g.cases}
      where service = 'lost_found' and kind = 'found' and status = 'returned' and ${g.cases.closedAt} is not null and ${(0,j.s)(g.cases.closedAt,b)}`),k=await (0,j.o)(a,f.B`select count(*)::int as base, (count(*) filter (where status = 'returned'))::int as ok
      from ${g.cases}
      where service = 'lost_found' and kind = 'found' and status <> 'withdrawn'
        and ${(0,j.s)(g.cases.createdAt,b)} and ${g.cases.createdAt} <= ${c}::timestamptz`),l=await (0,j.o)(a,f.B`select count(*)::int as total,
        (count(*) filter (where not exists (
          select 1 from case_events e where e.case_id = ${g.cases.id} and e.type = 'created' and e.actor_user_id is not null
        )))::int as online
      from ${g.cases}
      where service = 'lost_found' and ${(0,j.s)(g.cases.createdAt,b)}`),m=(0,j.D)(h.median);return{lostReceived:(0,i.A)(e("lost")),foundReceived:(0,i.A)(e("found")),returned:(0,i.A)((0,j.v)(h.n)),returnRate:(0,i.U)((0,j.v)(k.ok),(0,j.v)(k.base)),medianDaysToReturn:(0,i.L)((0,j.v)(h.n),null===m?null:(0,i.j)(m)),onlineShare:(0,i.U)((0,j.v)(l.online),(0,j.v)(l.total))}}async function n(a,b,d=new Date){let e=c(b,d),[f,g,h,i]=await Promise.all([m(a,e),k(a,e,d,"30d"!==b),(0,l.G)(a,e,d),(0,l.B)(a,e)]);return{period:b,from:e.from?.toISOString()??null,generatedAt:d.toISOString(),lostFound:f,complaints:g,journeys:h,signposts:i}}a.s(["f",0,n],771407)}];

//# sourceMappingURL=lib_performance_period_ts_1ocnzau_wwqva._.js.map