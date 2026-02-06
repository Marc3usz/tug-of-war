# The API of the websocket server
The backend is a websocket backend using socket.io library
It handles the following messages:

- `list_teams`
- `join_team <user_id> <team_id>`
- `create_user <username>`
- `delete_user <user_id>`
- `do_work <user_id>`
- `start_game`
- `current_state`

and requires the client to handle

- `game_started <matchup>`
- `game_state_update <current_game_state>`
- `game_ended <team>`

# Server-side

## `list_teams`
This message hander will return an array of objects in the form
```js
{
    team_id: number,
    team_name: string,
    player_names: string[]
}
```
to the clients `list_team_res` handler
> **__NOTE__:** it's a general convention that so called return values will be returned to the `..._res` message

## `join_team <user_id> <team_id>`
This message handler will assign the users `user_id` to the correct team. It will automatically leave the user's current team if they join a different team. If there is a game already in play, the change will be queued until the next game starts

## `create_user <username>`
Will return the `user_id` assigned to the player creating the user with the specified `user_id`

## `delete_user <user_id>`
Will remove the user with the specified `user_id`

## `do_work <user_id>`
Will "do work" (ie pull the rope) as the specified user

## `start_game`
Will end the intermission phase (which begins after the `game_ended` event is sent) and begin the game after a 5 second countdown. Won't do anything if there's currently a game happening

## `current_state`
Will return either an object where `state` is `"in-game"`, `"intermission"` or (`"loading"` and additionally has the `start_at` property set as the nr of miliseconds from the unix epoch at which the game will begin) depending on 

# Client-side

## `game_state_update <current_game_state>`
Sends over the current number in the range [-1,1] which is the % completion for either the left or right team (-1 means that the left team won, 1 means the right team won)

## `game_started <matchup>`
Sends over the 2 teams which will take part in the game, and indicates that someone has already triggered `start_game` and that the game will commence in 5 seconds (additionally)
```js
{
    start_at: number, // the nr of miliseconds since the unix epoch, Date.UTC() on the server, 5 seconds after the `start_game` event received
    left_team: {
        ... // same as from list_teams
    },
    right_team: {
        ... // same as above
    }
}
```

## `game_ended <team>`
Returns the team that won, indicates the last game ended and that all queued updates have been executed
```js
{
    team_id: number,
    team_name: string,
    player_names: string[]
}
```
