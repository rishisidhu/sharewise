# Sharewise

A small, private expense logger for a household of two. Open it, tap in what you
spent, and it lands in a shared Google Sheet where the real analysis lives —
category breakdowns, who-owes-whom, monthly trends, and spending-habit insights.
It's a Splitwise-style entry app with none of the accounts, ads, or data leaving
your own Google Sheet.

## How it works

Sharewise is a thin front end. The sheet does the thinking.

- You log an expense in the app: amount, what it was, category, who paid, whose
  expense it is (yours, your partner's, or shared), and whether it was an impulse.
- The entry is written as a row into a private Google Sheet.
- The sheet's built-in dashboard turns those rows into analysis: spend by
  category, each person's fair share and the running settle-up balance, annual
  projections, and habit metrics like how often you order out or buy on impulse.

## Privacy & access

- Only two specific Google accounts can write to the sheet. Everyone else is
  turned away.
- Financial data never lives in this codebase. It stays in the Google Sheet,
  behind a Google login. This repository contains the app's code only — no
  expenses, no credentials.

## Install on your phone

Open the app's web address, sign in with your Google account, then add it to
your home screen:

- iPhone (Safari): Share → Add to Home Screen.
- Android (Chrome): menu → Add to Home screen.

It then opens full-screen, like a native app.

## Categories

The category list is whatever's in the sheet's Settings tab. Add or rename a
category there and the app picks it up the next time you sign in.
