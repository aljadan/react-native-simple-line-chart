[**React Native Simple Line Chart**](../README.md) • **Docs**

***

[React Native Simple Line Chart](../globals.md) / LineChart

# Type Alias: LineChart

> **LineChart**: `object`

The props for the LineChart component

## Type declaration

### activeLineIndex?

> `optional` **activeLineIndex**: `number`

The index of the line that will trigger point event callbacks when user interacts with the chart

#### Default

```ts
0
```

### activePointSharedValue?

> `optional` **activePointSharedValue**: `DataPointSharedValue`

The shared value that will hold the active point (this is useful if you want to use the active point in other components)

### backgroundColor?

> `optional` **backgroundColor**: `string`

The background color of the chart

#### Default

```ts
'white'
```

### extraConfig?

> `optional` **extraConfig**: [`ExtraConfig`](../interfaces/ExtraConfig.md)

More configuration for the chart

### height?

> `optional` **height**: `number`

The height of the chart

#### Default

```ts
200
```

### lines

> **lines**: [`Line`](../interfaces/Line.md)[]

The data for the chart

#### Required

at least one line is required

### onPointFocus?

> `optional` **onPointFocus**: `onPointFocus`

This will run when the user taps on the a point on the chart

### onPointLoseFocus?

> `optional` **onPointLoseFocus**: `onPointLoseFocus`

This will run when the user release the tap on the a point on the chart

### width?

> `optional` **width**: `number`

The width of the chart (default value is the width of the screen)

## Defined in

[src/types.ts:9](https://github.com/Malaa-tech/react-native-simple-line-chart/blob/6e0215dbd194df10ddb3d5a2a472fbe3c71a004f/src/types.ts#L9)
