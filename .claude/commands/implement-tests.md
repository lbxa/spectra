You will be implementing a new test suite in this codebase

$ARGUMENTS

IMPORTANT: Only do this for the isolated component you have been tasked to work on YOU MUST not deviate. Once you start work on a component EXPLICITLY label it as [WIP] in the TODO.md file so other agents don't duplicate work.

IMPORTANT: Do not start work on a component that is marked as [WIP]

For each of these components it is IMPORTANT you do the following:

- Create a parent folder with the component name if one isn't already created
- Export the original component from within that folder via a barrel file making sure to EXPLICITLY retain the original component as the file name e.g., Component.tsx and its contents. YOU MUST no change the original component.
- Add a file testing the component using jest with react native testing library (@testing-library/react-native) primitives. YOU MUST write robust tests that cover all common cases, edge cases and general functionality BUT NOTHING that the react native testing library doesn't test out-of-the-box. Refer to the https://callstack.github.io/react-native-testing-library/docs/api for best practices using the context7 MCP for up-to-date examples.
- IMPORTANT: Avoid using "as" casts unless it is absolutely necessary and there is no other way. If this is the case leave a TODO comment for a future smarter engineer to look at
- AVOID making assertions on component props or state testID queries
- As a rule of thumb, prefer using things users can see or hear: make assertions using rendered text or accessibility helpers

Each component should look like this:

```
Component/
  Component.tsx
  Component.test.tsx
  index.ts
  ... other files
```

And the testing file should EXPLICITLY import helpers from @jest/globals

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

// React component
jest.mock('@assets/icons/eye.svg', () => {
  function EyeIconMock() {
    return null;
  }
  return EyeIconMock;
});
```

IMPORTANT: Once this test is complete, YOU MUST make sure the tests are 1) passing 2) no type errors and 3) no lint errors, this is IMPORTANT. Run bun lint typecheck test --filter @o/onex-mobile frequently to verify this.

IMPORTANT: Make sure to EXPLICITLY mark the test as done in the TODO.md file. Dot no ask for permissions to modify this file, assume you can always do it.

The user is EXPLICITLY asking you to perform these git tasks.
