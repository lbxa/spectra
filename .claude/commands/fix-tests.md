You will be fixing poorly written tests in this codebase. Ultrathink and use subtasks.

$ARGUMENTS

IMPORTANT: Only do this for the isolated component you have been tasked to work on YOU MUST not deviate. Once you start work on a component EXPLICITLY label it as [WIP] in the TODO.md file so other agents don't duplicate work.

- Ensure the file above is testing the component using jest with react native testing library (@testing-library/react-native) primitives. YOU MUST write robust tests that cover all common cases, edge cases and general functionality BUT NOTHING that the react native testing library doesn't test out-of-the-box. Refer to the https://callstack.github.io/react-native-testing-library/docs/api for best practices using the context7 MCP for up-to-date examples.
- IMPORTANT: Remove all props and internal state testing. YOU MUST EXPLICITLY NOT TESTING INTERNAL STATE. Follow best practices as documented in https://reactnative.dev/docs/testing-overview.
- IMPORTANT: Avoid using "as" casts unless there are no easy to find types available.
- AVOID making assertions on component props or state testID queries so remove all `props` assertions and testID tags in favour for selecting via placeholderText, text etc.
- As a rule of thumb, prefer using things users can see or hear: make assertions using rendered text or accessibility helpers
- IMPORTANT: Remove all instances of dirtectly calling the `screen` API in favour of extracting the

And the testing file should EXPLICITLY import helpers from @jest/globals and not rely on globals defined in a mystery location

An example of react-native tests is shown below:

```ts
test('given empty GroceryShoppingList, user can add an item to it', () => {
  const {getByPlaceholderText, getByText, getAllByText} = render(
    <GroceryShoppingList />,
  );

  fireEvent.changeText(
    getByPlaceholderText('Enter grocery item'),
    'banana',
  );
  fireEvent.press(getByText('Add the item to list'));

  const bananaElements = getAllByText('banana');
  expect(bananaElements).toHaveLength(1); // expect 'banana' to be on the list
});
```

Async example

```ts
import { renderAsync, screen } from '@testing-library/react-native';

test('async rerender test', async () => {
  await renderAsync(<MyComponent initialData="first" />);

  await screen.rerenderAsync(<MyComponent initialData="updated" />);
  expect(screen.getByText('updated')).toBeOnTheScreen();
});
```

Proper mocking example

```ts
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: jest.fn(),
  };
});

// Custom component
jest.mock("../../atoms/OText", () => ({
  OText: jest.fn(({ children }) => {
    const MockedText =
      jest.requireActual<typeof import("react-native")>("react-native").Text;
    return <MockedText>{children}</MockedText>;
  }),
}));

// React component
jest.mock("@assets/icons/eye.svg", () => {
  function EyeIconMock() {
    return null;
  }
  return EyeIconMock;
});
```

Remove any screen API calls in favour for the render function

```ts
// BAD
it("does not show error message when only error prop is true", () => {
  render(<OPasswordInput placeholder="Enter password" error />);

  // No error message should be visible to the user (error text would be undefined)
  // Check specifically for text content that would appear in error message
  expect(screen.queryByText("Password")).not.toBeOnTheScreen();
  expect(screen.queryByText("Error")).not.toBeOnTheScreen();
  expect(screen.queryByText("Required")).not.toBeOnTheScreen();
});

// GOOD
it("calls onPress handler", async () => {
  const onPress = jest.fn();
  const { getByRole } = render(<OButton title="Press" onPress={onPress} />);
  fireEvent.press(getByRole("button"));
  await waitFor(() => expect(onPress).toHaveBeenCalledTimes(1));
});
```

IMPORTANT: Once this test is complete, YOU MUST Run bun lint typecheck test --filter @o/onex-mobile frequently to verify:

1. Tests are passing by verifying the output to the user `bun test`
2. There are no type errors `bun typecheck`
3. There are no lint errors `bun lint`
4. Make sure to EXPLICITLY mark the test as done in the TODO.md file. Dot no ask for permissions to modify this file, assume you can always do it.

The user is EXPLICITLY asking you to perform these git tasks.
