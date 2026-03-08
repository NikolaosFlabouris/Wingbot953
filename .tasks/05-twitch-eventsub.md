# Task 05: Install and Implement Twitch EventSub

**Priority:** P1 (Missing Features)
**Area:** Twitch Integration
**Branch:** `feature/05-twitch-eventsub`
**Status:** TODO

## Problem

The bot has no EventSub integration. EventSub provides real-time webhook/WebSocket notifications for events that can't be captured through IRC chat alone. Currently, channel point redemptions and stream status are polled on 5-second intervals, which is wasteful and introduces latency.

## Implementation Plan

### 1. Install Package
```bash
npm install @twurple/eventsub-ws
```
Use the WebSocket transport (simpler than webhooks - no public URL needed).

### 2. Events to Subscribe To

**High Priority:**
- **channel.follow** - Real-time follow notifications
- **channel.hype_train.begin / .progress / .end** - Hype train lifecycle
- **channel.channel_points_custom_reward_redemption.add** - Replace current polling with real-time
- **stream.online / stream.offline** - Replace current 5s polling with instant notifications

**Medium Priority:**
- **channel.prediction.begin / .lock / .end** - Prediction lifecycle
- **channel.poll.begin / .progress / .end** - Poll lifecycle
- **channel.shoutout.create / .receive** - Shoutout events
- **channel.subscribe** - Could supplement chat-based sub events
- **channel.subscription.gift** - Supplement gift sub handling

**Lower Priority:**
- **channel.ad_break.begin** - Ad break notifications
- **channel.charity_campaign.donate** - Charity donations
- **channel.shield_mode.begin / .end** - Shield mode toggles

### 3. Architecture

- Create a new file `Server/Integrations/TwitchEventSub.ts`
- Initialize after Twitch auth is complete (needs the auth provider)
- Use the streamer account's auth for subscriptions that require broadcaster scope
- Emit events through the existing EventBus where appropriate
- Broadcast relevant events to WebSocket for the unified chat display

## Files to Create

- `Server/Integrations/TwitchEventSub.ts`

## Files to Modify

- `package.json` - Add `@twurple/eventsub-ws` dependency
- `Wingbot953.ts` - Initialize EventSub after Twitch auth
- `Server/Integrations/Twitch.ts` - Remove polling for channel point redemptions and stream status once EventSub handles them
- `Server/Integrations/EventBus.ts` - Add new event types if needed

## Acceptance Criteria

- [ ] `@twurple/eventsub-ws` is installed
- [ ] EventSub WebSocket connection is established after Twitch auth
- [ ] Follow events are received and broadcast to WebSocket
- [ ] Hype train events are received and broadcast
- [ ] Channel point redemptions work via EventSub (polling can be removed or kept as fallback)
- [ ] Stream online/offline events supplement or replace polling
- [ ] At least predictions and polls are handled at a basic level
- [ ] Shoutout events are handled
- [ ] `npm run compile` passes
- [ ] `npm test` passes

## Notes

- Use `EventSubWsListener` from `@twurple/eventsub-ws` - it handles reconnection automatically
- The bot already requests extensive OAuth scopes, so most EventSub subscriptions should work without scope changes
- Start with WebSocket transport; webhook transport can be considered later for production reliability
- Don't remove the existing polling immediately - keep it as fallback until EventSub is proven stable
