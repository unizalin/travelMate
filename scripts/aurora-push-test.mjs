// Secrets must be injected into this process by the operator, never passed as arguments.
const {CRON_SECRET,AURORA_TEST_USER_ID,AURORA_APP_ORIGIN='https://travel-mate-nine-rho.vercel.app'}=process.env
if(!CRON_SECRET || !AURORA_TEST_USER_ID || !AURORA_APP_ORIGIN.startsWith('https://')) {
 console.error('Set CRON_SECRET, AURORA_TEST_USER_ID and an HTTPS AURORA_APP_ORIGIN in the process environment first.')
 process.exitCode=1
} else {
 try {
  const response=await fetch(new URL('/api/aurora-notifications/check',AURORA_APP_ORIGIN),{method:'POST',headers:{Authorization:`Bearer ${CRON_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify({testUserId:AURORA_TEST_USER_ID}),signal:AbortSignal.timeout(60000)})
  const result=await response.json()
  if(!response.ok || typeof result.tested!=='number')throw Error()
  console.log(`Test notification sent to ${result.tested} active device(s). Confirm receipt on the phone; this output alone is not end-to-end verification.`)
 } catch {console.error('Manual push test failed. Check server configuration and an active tonight subscription.');process.exitCode=1}
}
