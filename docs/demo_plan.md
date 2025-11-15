# Week 9 Demo Assets Plan

## Slide Outline
1. **Introduction**
   - Team members
   - Project objectives
2. **Architecture Overview**
   - Tech stack (Express, PostgreSQL, React)
   - Deployment diagram
3. **Feature Deep Dive**
   - Registration + OTP verification
   - Bidding (manual + auto + seller controls)
   - Post-auction workflow & ratings
4. **Security & Compliance**
   - JWT auth, role-based protections
   - Validation & email notifications
5. **Testing & Tooling**
   - Automated scripts (`testing/w9`)
   - Seed data strategy
6. **Roadmap & Future Work**

## Video Walkthrough Script
1. Register new bidder and show OTP verification screen.
2. Demonstrate profile editing + change password and rating history.
3. As bidder, place bids on both locked and open Week9 products.
4. As seller, showcase WYSIWYG product creation and seller listing overview.
5. Close with post-auction order flow and inbox notification summary.

## Live Demo Checklist
- [ ] Run `testing/w9/seed_week9_data.py`.
- [ ] Start backend/frontend services.
- [ ] Prepare mail catcher (console logs) to highlight notifications.
- [ ] Open Verify Email page for live OTP redeem.
- [ ] Toggle seller controls (allow/unrated checkbox) to show impact in UI.
