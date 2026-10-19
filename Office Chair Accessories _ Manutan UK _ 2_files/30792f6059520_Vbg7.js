//15.263.3-es2019 (30792f6059520)
var CS_CONF={"collectionEnabled":true,"useSentry":false,"projectId":23088,"status":1,"hostnames":["manutan.co.uk"],"crossDomainTracking":0,"crossDomainSingleIframeTracking":0,"consentRequired":0,"allowSubdomains":1,"visitorCookieTimeout":34164000000,"sampleRate":100,"replayRecordingRate":50,"validationRate":10,"lastTrackingDraw":1754473175,"trackerDomain":"c.az.contentsquare.net","recordingDomain":"r.contentsquare.net","useMalkaPipeline":1,"ed":"l.contentsquare.net/log/web","eMerchandisingEnabled":0,"mouseMoveHeatmapEnabled":1,"jsErrorsEnabled":1,"customErrorsEnabled":1,"jsCustomErrorsEnabled":0,"apiErrorsEnabled":1,"customHashIdEnabled":1,"recordingEncryptionEnabled":0,"recordingEncryptionPublicKey":null,"recordingEncryptionPublicKeyId":0,"secureCookiesEnabled":0,"triggerSessionReplayEnabled":0,"triggerSessionReplayRegex":null,"dynamicIdRegex":null,"whitelistedAttributes":[],"replayRecordingUnmaskedUrlRegex":null,"replayRecordingUnmaskedUrlRegexRules":[],"replayRecordingMaskedUrlRegexRules":[{"operator":"regex-to-rule","value":".*((\\/UserRegistrationForm)|(\\/AddressBookForm)|(\\/CouponWallet)|(\\/OrganizationsAndUsersView)|(\\/BuyerApprovalView)|(\\/NumberOfOrderApprovalsView)|(\\/OrderApprovalView)|(\\/MyApprovalsListView)|(\\/MyOrdersToApproveListView)|(\\/ApprovalDetailsView)|(\\/MIEmailRecoveryAccountSend)|(\\/UserRegistrationEmailActivateResend)|(\\/ResetPassword)|(\\/ResetPasswordGuestErrorView)|(\\/QuotationTransformationView)|(\\/AjaxLogonForm)|(\\/OrderCheckoutView)).*","ignoreQueryParams":0,"ignoreURIFragments":0,"ignoreCaseSensitivity":0}],"replayRecordingMaskedUrlRegex":null,"anonymisationMethod":"replayRecordingMaskedUrlRegexRules","tagDeploymentMode":"CONTENTSQUARE","experimental":null,"iframesTracking":0,"textVisibilityEnabled":1,"cookielessTrackingEnabled":0,"malkaUrlEnabled":0,"malkaEtrEnabled":0,"pathComputationRules":{"reliableSelectors":[],"uniqueAttributes":[],"uniqueCssSelectors":[]},"asyncSerializerEnabled":1,"pendingInactivityTimeout":5000,"accessibilityEnabled":0,"uxaDomain":"app.contentsquare.com","webviewsTrackingEnabled":0,"useStaticResourceManager":1,"performanceTimingOptions":{"withResource":false,"withNavigation":false},"replayConsentRequiredForSession":0,"eventsApiEnabled":0,"clickedElementTextEnabled":0,"collectHierarchy":0,"collectSubmit":0,"collectTargetText":0,"apiErrors":{"collectStandardHeaders":0,"collectionRules":[{"bodyAttributePaths":[{"path":"errors[0].message","encrypted":0,"primary":0,"type":"response"}],"collectQueryParam":0,"collectRequestBody":0,"collectResponseBody":0,"customHeaders":[],"url":"graphql","statusCode":200,"bodyContent":"errors\":"},{"bodyAttributePaths":[],"collectQueryParam":0,"collectRequestBody":0,"collectResponseBody":0,"customHeaders":[{"headerName":"cf-cache-status","encrypted":0,"type":"request"},{"headerName":"cf-ray","encrypted":0,"type":"request"},{"headerName":"x-cache-enabled","encrypted":0,"type":"request"},{"headerName":"x-cache","encrypted":0,"type":"request"},{"headerName":"x-amz-cf-id","encrypted":0,"type":"request"},{"headerName":"x-ray","encrypted":0,"type":"request"},{"headerName":"upgrade","encrypted":0,"type":"request"},{"headerName":"X-Request-Id","encrypted":0,"type":"request"},{"headerName":"x-wix-request-id","encrypted":0,"type":"request"},{"headerName":"X-Pass-Why","encrypted":0,"type":"request"},{"headerName":"x-nginx-cache-status","encrypted":0,"type":"request"},{"headerName":"trace-id","encrypted":0,"type":"request"},{"headerName":"traceparent","encrypted":0,"type":"request"},{"headerName":"X-NewRelic-Transaction","encrypted":0,"type":"request"},{"headerName":"X-Datadog-Trace-ID","encrypted":0,"type":"request"}]}]},"customErrors":{"consoleMessageLogLevels":[]},"displayAdOptions":null,"taskSchedulerOptions":{"enabled":1},"malkaQuotaServiceDomain":"q-eu1.az.contentsquare.net","malkaRecordingDomain":"k-eu1.az.contentsquare.net","staticResourceManagerDomain":"srm.aa.contentsquare.net","voc":{"siteId":null,"enabled":0},"anonymizeDigits":null,"tagVerificationDomain":"tcvsapi.contentsquare.com","dynamicConfDomain":"t.contentsquare.net/settings","startMode":1,"isLegacyHJ":false,"maskMedia":false,"experiments":{"list":[]},"tagVerificationEnabled":true,"trackingCodeVerified":true,"useBootstrapFile":true,"urlBlacklist":null};
CS_CONF.tagHost=(function(s){var h=/^[a-z][a-z0-9+.-]*:\/\/([^\/?#:]+)/i.exec(s);h=h?h[1].toLowerCase():"";return /(^|\.)contentsquare\.net$/.test(h)?"contentsquare":/(^|\.)clicktale\.net$/.test(h)?"clicktale":"self"})((document.currentScript||{}).src||"");
var CS_INTEGRATIONS_CONF = {"ab-tasty":[],"bazaarvoice":[]};
(function(){function e(){return window.csqDebuggerEnabled===!0||window.location.href.includes(`csqDebuggerEnabled=true`)}function t(t,n,r=`info`){if(!e())return;let i=r===`warn`?`rgb(255, 86, 2)`:`#2a9d8f`;console.log(`%cCSQ INTEGRATION: [${t}] : ${n}`,`color: ${i}; font-weight: bold`)}function n(e,t){let n=document.getElementById(`csKey`),r=document.getElementById(`csValue`);return n!==null&&(n.textContent=e),r!==null&&(r.textContent=String(t)),`Dynamic variable with ${e} and value ${t} sent`}function r(){return window._uxa=window._uxa||[],window._uxa}function i(e){return e instanceof Error?e.message:String(e)}function a(t,n){try{t()}catch(t){r().push([`logSnippetError`,n,t]),e()&&(console.log(`%cCSQ INTEGRATION ERROR: [${n}] : ${i(t)}`,`color:rgb(228, 25, 45); font-weight: bold`),console.log(t))}}function o(e,t){var n,r;(n=window).CS_CONF!=null||(n.CS_CONF={integrations:[]}),(r=window.CS_CONF).integrations!=null||(r.integrations=[]);let i={name:e,version:t};window.CS_CONF.integrations.push(i)}function s(e,t){r().push([`trackDynamicVariable`,{key:e,value:t}])}function c(e){r().push([`event`,e])}function l(e,r){return(i,a)=>{let o=`${r}${i}`;s(o,a),t(e,n(o,a))}}function u(e){return!e||typeof e!=`string`?``:e.replace(/[\W_]+/g,`-`)}function d(e,t,n=window){let r=e.split(`.`);function i(e,n){let a=r[e];a!==void 0&&(e===r.length-1?f(a,t,n):f(a,()=>{let t=n[a];t!==void 0&&i(e+1,t)},n))}i(0,n)}function f(e,t,n){let r=n;if(r[e]){t();return}let i,a=!1;Object.defineProperty(r,e,{configurable:!0,enumerable:!0,get(){return i},set(e){i=e,a||(a=!0,t())}})}var p=`ab-tasty`,m=l(p,`AB_ABT_`),h=[];a(()=>{o(`AB Tasty`,`3.6.3`),window.addEventListener(`abtasty_executedCampaign`,e=>{a(()=>v(e.detail),p)}),d(`ABTasty`,y)},p);function g(e,t){var n,r,i;let a=String(e),o=(n=window.ABTasty)==null||(n=n.results)==null?void 0:n[a];if(!o)return null;let s=(r=o.name)==null?null:r,c=(i=o.variationName)==null?`Variation 1`:i,l;if(t===`mpt`){var u;let e=(u=window.ABTasty)==null||(u=u.accountData)==null?void 0:u.tests,t=e==null?void 0:e[a],n=t==null?void 0:t.parentID;if(n&&n!==0){var d;l=e==null||(d=e[n])==null?void 0:d.name}}return s?{campaignName:s,variationName:c,...l!==void 0&&{parentName:l}}:null}function _(e,t){let n=`${e}~~~~${t}`;if(h.includes(n))return;h.push(n),m(e,t);let r=`${u(e)}-${t}`;c(r),c(`ABT_${r}`)}function v(e){if(!e.campaignId)return;let t=g(e.campaignId,e.type);t&&(_(t.campaignName,t.variationName),t.parentName&&_(t.parentName,t.variationName))}function y(){setTimeout(()=>{var e;let t=(e=window.ABTasty)==null||(e=e.eventState)==null?void 0:e.executedCampaign;if((t==null?void 0:t.status)===`complete`&&Array.isArray(t.detail))for(let e of t.detail)v(e)},500)}})();
(function(){function e(){return window.csqDebuggerEnabled===!0||window.location.href.includes(`csqDebuggerEnabled=true`)}function t(t,n,r=`info`){if(!e())return;let i=r===`warn`?`rgb(255, 86, 2)`:`#2a9d8f`;console.log(`%cCSQ INTEGRATION: [${t}] : ${n}`,`color: ${i}; font-weight: bold`)}function n(e,t){let n=document.getElementById(`csKey`),r=document.getElementById(`csValue`);return n!==null&&(n.textContent=e),r!==null&&(r.textContent=String(t)),`Dynamic variable with ${e} and value ${t} sent`}function r(){return window._uxa=window._uxa||[],window._uxa}function i(e){return e instanceof Error?e.message:String(e)}function a(t,n){try{t()}catch(t){r().push([`logSnippetError`,n,t]),e()&&(console.log(`%cCSQ INTEGRATION ERROR: [${n}] : ${i(t)}`,`color:rgb(228, 25, 45); font-weight: bold`),console.log(t))}}function o(e,t){var n,r;(n=window).CS_CONF!=null||(n.CS_CONF={integrations:[]}),(r=window.CS_CONF).integrations!=null||(r.integrations=[]);let i={name:e,version:t};window.CS_CONF.integrations.push(i)}function s(e,t){r().push([`trackDynamicVariable`,{key:e,value:t}])}function c(e,r){return(i,a)=>{let o=`${r}${i}`;s(o,a),t(e,n(o,a))}}function l(e,t,n=window){let r=e.split(`.`);function i(e,n){let a=r[e];a!==void 0&&(e===r.length-1?u(a,t,n):u(a,()=>{let t=n[a];t!==void 0&&i(e+1,t)},n))}i(0,n)}function u(e,t,n){let r=n;if(r[e]){t();return}let i,a=!1;Object.defineProperty(r,e,{configurable:!0,enumerable:!0,get(){return i},set(e){i=e,a||(a=!0,t())}})}var d=`bazaarvoice`,f=c(d,`UGC_BV_`),p=[],m=!1;a(()=>{o(`Bazaarvoice`,`2.8.2`),l(`BV`,h),l(`$BV`,h)},d);function h(){m||(m=!0,setTimeout(()=>{var e;let t=(e=window.BV)==null?window.$BV:e;!t||typeof t.configure!=`function`||t.configure(`global`,{events:{submissionLoad(e){if(!(e!=null&&e.contentType))return;let t=g(e.contentType,`Loaded`);t&&v(t);let n=e.TotalReviewCount;n!==void 0&&f(`Total Review Count`,n)},submissionClose(e){if(!(e!=null&&e.contentType))return;let t=g(e.contentType,`Closed`);t&&v(t)},submissionSubmitted(e){if(!(e!=null&&e.contentType))return;let{contentType:t}=e;t===`review`&&e.SubmittedStep&&f(`Review Submitted Step`,e.SubmittedStep);let n=_(t);n&&v(n);let r=e.Id;r&&v(`Product ID`,r)}}})},500))}function g(e,t){return e===`review`?`Review Form ${t}`:e===`question`?`Question Form ${t}`:``}function _(e){return e===`review`?`Review Submitted`:e===`question`?`Question Submitted`:``}function v(e,t=`true`){p.includes(e)||(p.push(e),f(e,t))}})();
function injectTag(stable, candidate, share) {
  if (typeof CS_CONF === "undefined") {
    return;
  }
  const d2 = document;
  const logUrl = `https://${CS_CONF.ed}`;
  const pid = CS_CONF.projectId;
  const w2 = window;
  const injectedPids = w2.CS_TAG_PIDS = w2.CS_TAG_PIDS || {};
  const injected = injectedPids[String(pid)];
  if (injected) {
    if (injected !== 1) CS_CONF.rollout = injected.rollout;
    return;
  }
  const rollout = candidate && share ? { arm: Math.random() < share ? "candidate" : "stable", share } : null;
  CS_CONF.rollout = rollout;
  injectedPids[String(pid)] = { rollout };
  function log2(message2, level = "critical") {
    const page = location.origin + location.pathname;
    const msg = `${logUrl}?a=uxa&l=${level}&m=${encodeURIComponent(message2)}&pid=${pid}&p=${encodeURIComponent(page)}`;
    fetch(msg, { mode: "cors", credentials: "omit", keepalive: true }).catch(
      () => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = msg;
      }
    );
  }
  const currentScript = document.currentScript;
  const hjDomains = ["static-integration.hotjar.com", "static.hotjar.com"];
  const isHotjar = hjDomains.some((x2) => currentScript?.src.includes(x2));
  const origin = isHotjar ? new URL(currentScript.src).origin : "https://t.contentsquare.net";
  const path2 = rollout?.arm === "candidate" && candidate ? candidate : stable;
  const expectedSrc = new URL(`${origin}/${path2}`).href;
  const element = d2.createElement("script");
  let stopped = false;
  let errorTimer;
  const observer = new MutationObserver((records) => checkAttributes(records));
  function cleanup() {
    stopped = true;
    clearTimeout(errorTimer);
    observer.disconnect();
    d2.removeEventListener("securitypolicyviolation", onCsp);
    element.onload = null;
    element.onerror = null;
  }
  function report(cause) {
    log2(`Bootstrap error: ${cause}`);
  }
  function checkAttributes(records = observer.takeRecords()) {
    if (stopped) return true;
    for (const attribute of ["src", "type"]) {
      const expected = attribute === "src" ? expectedSrc : null;
      const observed = element.getAttribute(attribute);
      if (attribute === "src" && element.src !== expectedSrc || observed !== expected || records.some(
        (record) => record.attributeName === attribute && record.oldValue !== expected
      )) {
        cleanup();
        report(`${attribute} changed observed=${JSON.stringify(observed)}`);
        return true;
      }
    }
    return false;
  }
  function onCsp(event) {
    if (stopped || !event.isTrusted || event.disposition !== "enforce" || !["script-src", "script-src-elem"].includes(event.effectiveDirective) || event.blockedURI !== expectedSrc && !(event.target === element && event.blockedURI === origin)) {
      return;
    }
    if (checkAttributes()) return;
    cleanup();
    report(
      `csp blocked directive=${event.effectiveDirective} blockedURI=${event.blockedURI}`
    );
  }
  d2.addEventListener("securitypolicyviolation", onCsp);
  element.onload = () => {
    if (!checkAttributes()) cleanup();
  };
  element.onerror = () => {
    if (checkAttributes() || errorTimer !== void 0) return;
    errorTimer = setTimeout(() => {
      if (checkAttributes()) return;
      cleanup();
      report("others");
    }, 0);
  };
  try {
    element.src = expectedSrc;
    element.async = true;
    element.fetchPriority = "high";
    element.crossOrigin = "anonymous";
    if (!checkAttributes()) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["src", "type"],
        attributeOldValue: true
      });
    }
    (d2.head || d2.documentElement).appendChild(element);
    checkAttributes();
  } catch (error2) {
    cleanup();
    throw error2;
  }
}
injectTag("releases/15.263.3/es2019/3f00004-230c859a.js");

// signature-ed73b68575b39d224e7c2d15948a5df475c2848f50d047a235f7ca74f8c70c13