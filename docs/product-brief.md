# Product brief

## Summary

Trailhead Camp Planner is a shared operating workspace for multi-person camping trips. It is built for the moment a trip becomes too complex for a single organizer's memory but is still too informal for heavyweight project software.

## User problem

Group camping plans fragment across chat, booking confirmations, personal notes, shopping lists, and payment apps. That fragmentation creates recurring failures:

- nobody knows which plan is current;
- responsibilities are implicit until something is forgotten;
- broad edit access makes coordination fragile, while one-person control creates a bottleneck;
- shared purchases and reimbursements are reconstructed after the trip;
- AI assistance can save time, but an unreviewed write can damage a live plan.

## Target users

- The organizer coordinating reservations, membership, and final decisions
- Experienced helpers who can maintain trip content
- Contributors who can claim or add bounded work
- Campers who mainly need a trustworthy, readable plan

## Product principles

1. **One operating picture:** trip state belongs in a structured workspace; conversation supplements it.
2. **Permission by responsibility:** access follows the job a person is doing on this trip.
3. **Ownership over reminders:** an item with an owner and status is more useful than another message.
4. **Transparent money:** the path from recorded costs to settlement must be inspectable.
5. **AI proposes, people commit:** convenience cannot erase accountability.
6. **Private by default:** membership, not possession of a URL, determines access.

## Current workflows

- Create a trip and invite members into an explicit role
- Maintain destination, dates, campsites, tents, vehicles, and assignments
- Track shared gear, shopping, and personal packing readiness
- Record expenses and purchased items, then calculate party- or member-based settlement
- Post group updates and replies, with private presence and optional photo sharing
- Ask the assistant to propose allow-listed additions, review individual changes, confirm, and undo the resulting action

## Success measures

A product deployment would measure outcomes rather than activity alone:

- percentage of trips with every shared item owned before departure;
- time from invite to accepted membership;
- percentage of costs assigned to a payer and settlement target;
- reduction in last-day unresolved shopping or gear items;
- AI proposal acceptance, partial-acceptance, rejection, and undo rates;
- member-reported confidence that the displayed plan is current.

No analytics integration is included in this open-source repository.

## Non-goals for this release

- Booking or payment processing
- Public trip discovery or social networking
- Route navigation, emergency response, or safety guarantees
- Autonomous AI changes
- Production hosting or a managed multi-tenant service
