# Task 09d - keep-alive and alerting

- Owner: ToonRz (account access required)
- Reviewers: TBD
- Depends on: 09c
- Spec: `docs/deployment-plan.md` section 6

## Scope

Keep the Render Free service from spinning down and get an email when it goes
down, using one UptimeRobot monitor. No code changes.

## Steps

1. Create an UptimeRobot Free account under ToonRz.
2. Add an HTTP(s) monitor for `https://<render-service>.onrender.com/healthz`
   at a 5-minute interval, with ToonRz's email as the alert contact.
3. Record the monitor name, the enabled date, and the interval in section 10
   of `docs/deployment-plan.md`. Do not record the account email or any API
   key.
4. Add a monthly reminder for the first of the month to check Render
   instance-hour usage (section 6.3).

## Acceptance

- [ ] the monitor has been green for 24 consecutive hours, with a screenshot
      of its response-time graph;
- [ ] the Render service's events show no spin-down during those 24 hours;
- [ ] stopping the service briefly (Render → Suspend, then Resume) produces a
      down alert email and an up alert email, with a screenshot of each;
- [ ] section 10 records the monitor and the enabled date;
- [ ] the instance-hour reminder exists.
