module.exports=[31911,260964,e=>{"use strict";var t=e.i(875225);e.s(["w",0,function(e,n){let r=[(0,t.M)(e.revokedAt),(0,t.F)((0,t.M)(e.expiresAt),(0,t.H)(e.expiresAt,n))];return e.consumedAt&&r.unshift((0,t.M)(e.consumedAt)),(0,t.b)(...r)},"f",0,function(e,t){return e.consumedAt?"accepted":e.revokedAt?"revoked":e.expiresAt&&e.expiresAt<=t?"expired":"pending"}],31911);var n=e.i(518899);async function r(e,t,s,i=Date.now()){let a=1e3*s.windowSeconds,o=(await e.execute(n.B`
    insert into rate_limit (id, key, count, last_request)
    values (${crypto.randomUUID()}, ${`app:${t}`}, 1, ${i})
    on conflict (key) do update set
      count = case when rate_limit.last_request <= ${i-a} then 1 else rate_limit.count + 1 end,
      last_request = case when rate_limit.last_request <= ${i-a} then ${i} else rate_limit.last_request end
    returning count, last_request
  `)).rows[0];if(!o)throw Error("Rate limit upsert returned no row.");let u=Number(o.count),l=Number(o.last_request);return u<=s.max?{allowed:!0,retryAfterSeconds:0}:{allowed:!1,retryAfterSeconds:Math.max(1,Math.ceil((l+a-i)/1e3))}}let s={windowSeconds:900,max:30};e.s(["f",0,r,"U",0,function(e,t){return r(e,`token:${t??"unknown"}`,s)}],260964)},703966,e=>{"use strict";var t=e.i(838735);async function n(e,n){await e.insert(t.auditLog).values({actorUserId:n.actorUserId??null,actorOrganisationId:n.actorOrganisationId??null,action:n.action,entityType:n.entityType,entityId:String(n.entityId),before:n.before??null,after:n.after??null,ip:n.ip??null,userAgent:n.userAgent??null,requestId:n.requestId??null})}async function r(e,t,r){return e.transaction(async e=>r(e,r=>n(e,{...t,...r})))}e.s(["J",0,n,"j",0,r])}];

//# sourceMappingURL=lib_0oca3updfg4pn._.js.map