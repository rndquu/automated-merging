# `@ubiquibot/automated-merging`

Automatically merge pull-requests based on the reviewer count, the time elapsed since the last activity, depending 
on the association of the pull-request author.

## Configuration example

```yml
- plugin: ubiquibot/automated-merging
  name: automated-merging
  id: automated-merging
  description: "Automatically merge pull-requests."
  with:
    approvalsRequired:
      collaborator: 1 # defaults to 1
      contributor: 2 # defaults to 2
    mergeTimeout:
      collaborator: "3.5 days" # defaults to 3.5 days
      contributor: "7 days" # defaults to 7 days
```

## Testing

```shell
yarn test
```
