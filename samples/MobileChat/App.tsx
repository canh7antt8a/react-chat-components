/**
 * In order for react-native to work within a monorepository,
 * this app has been changed according to this blog post:
 * https://ecklf.com/blog/rn-monorepo
 */

import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  // StyleSheet,
  Text,
  useColorScheme,
  // View,
} from "react-native";
import PubNub from "pubnub";
import { PubNubProvider } from "pubnub-react";
import { useChannels } from "@pubnub/react-chat-components";
import { Colors, Header } from "react-native/Libraries/NewAppScreen";

const pubnub = new PubNub({
  publishKey: "pub-c-c442e30a-69da-45cc-bb6a-e80847b7da1e",
  subscribeKey: "sub-c-f0f75b24-0b1c-11ec-a3aa-62fd72cca367",
  uuid: "mobile-user",
});

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({ children, title }) => {
//   const isDarkMode = useColorScheme() === "dark";
//   return (
//     <View style={styles.sectionContainer}>
//       <Text
//         style={[
//           styles.sectionTitle,
//           {
//             color: isDarkMode ? Colors.white : Colors.black,
//           },
//         ]}
//       >
//         {title}
//       </Text>
//       <Text
//         style={[
//           styles.sectionDescription,
//           {
//             color: isDarkMode ? Colors.light : Colors.dark,
//           },
//         ]}
//       >
//         {children}
//       </Text>
//     </View>
//   );
// };

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={backgroundStyle}>
        <PubNubProvider client={pubnub}>
          <Test />
        </PubNubProvider>
        <Header />
      </ScrollView>
    </SafeAreaView>
  );
};

export function Test(): JSX.Element {
  const [channels] = useChannels();

  React.useEffect(() => {
    console.log(channels);
  }, [channels]);

  return <Text>TEST COMPONENT USING A CUSTOM HOOK</Text>;
}

// const styles = StyleSheet.create({
//   sectionContainer: {
//     marginTop: 32,
//     paddingHorizontal: 24,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: "600",
//   },
//   sectionDescription: {
//     marginTop: 8,
//     fontSize: 18,
//     fontWeight: "400",
//   },
//   highlight: {
//     fontWeight: "700",
//   },
// });

export default App;
