import React, { useRef, useState } from 'react';
import { SafeAreaView, View, Text, Button, ScrollView, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const BASE_INJECTED_JS = `
  (function() {
    const oldLog = console.log;
    const oldError = console.error;

    console.log = function(...args) {
      window.ReactNativeWebView.postMessage("LOG: " + args.join(" "));
      oldLog.apply(console, args);
    }

    console.error = function(...args) {
      window.ReactNativeWebView.postMessage("ERROR: " + args.join(" "));
      oldError.apply(console, args);
    }

    document.body.addEventListener('click', function(e) {
      e.preventDefault();
      e.target.style.outline = '2px solid red';
      window.ReactNativeWebView.postMessage("INSPECTED: " + e.target.tagName + " - " + e.target.className);
    }, true);
  })();
`;

export default function App() {
  const webviewRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [cssCode, setCssCode] = useState('');

  const handleMessage = (event) => {
    setLogs(prev => [...prev, event.nativeEvent.data]);
  };

  const applyCSS = () => {
    const escapedCSS = cssCode.replace(/`/g, '\\`');
    const injection = `
      (function() {
        let style = document.getElementById("injected-css-style");
        if (!style) {
          style = document.createElement("style");
          style.id = "injected-css-style";
          document.head.appendChild(style);
        }
        style.innerHTML = \`${escapedCSS}\`;
      })();
    `;
    webviewRef.current.injectJavaScript(injection);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 2 }}>
        <WebView
          ref={webviewRef}
          source={{ uri: 'http://localhost:3000' }}
          injectedJavaScript={BASE_INJECTED_JS}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState
        />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={styles.editorContainer}>
        <Text style={styles.label}>🎨 CSS Live Editor</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="ex: body { background: black; color: lime; }"
          value={cssCode}
          onChangeText={setCssCode}
        />
        <Button title="✅ Aplică CSS" onPress={applyCSS} />
      </KeyboardAvoidingView>

      <View style={styles.console}>
        <Text style={styles.consoleTitle}>🧠 Console</Text>
        <ScrollView>
          {logs.map((log, index) => (
            <Text key={index} style={log.includes('ERROR') ? styles.error : styles.log}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  editorContainer: {
    padding: 8,
    backgroundColor: '#222',
  },
  label: {
    color: '#0ff',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  textArea: {
    height: 100,
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 6,
    color: 'white',
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#333',
  },
  console: {
    height: 120,
    backgroundColor: '#111',
    padding: 8,
  },
  consoleTitle: {
    color: '#0f0',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  log: {
    color: '#eee',
    fontSize: 12,
  },
  error: {
    color: 'red',
    fontSize: 12,
  },
});
