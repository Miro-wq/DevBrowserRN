import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
    e.stopPropagation();
    const el = e.target;
    el.style.outline = '2px solid red';

    const domInfo = {
      tag: el.tagName,
      id: el.id || null,
      className: el.className || null,
      text: el.textContent.trim().slice(0, 100)
    };
    window.ReactNativeWebView.postMessage("DOMINFO: " + JSON.stringify(domInfo));
  }, true);
})();
`;

export default function App() {
  const webviewRef = useRef(null);
  const [logs, setLogs] = useState([]);
  const [cssCode, setCssCode] = useState('');
  const [domInfo, setDomInfo] = useState(null);

  const handleMessage = (event) => {
    const data = event.nativeEvent.data;
    if (data.startsWith('DOMINFO: ')) {
      const raw = data.replace('DOMINFO: ', '');
      try {
        const info = JSON.parse(raw);
        setDomInfo(info);
      } catch (err) {
        console.error('Failed to parse DOMINFO:', err);
      }
    } else {
      setLogs(prev => [...prev, data]);
    }
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
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        {/* eslint-disable-next-line react-native/no-inline-styles */}
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

      {domInfo && (
        <View style={styles.domInspector}>
          <Text style={styles.label}>🔎 DOM Inspector</Text>
          <Text style={styles.domText}>Tag: {domInfo.tag}</Text>
          <Text style={styles.domText}>ID: {domInfo.id || '—'}</Text>
          <Text style={styles.domText}>Class: {domInfo.className || '—'}</Text>
          <Text style={styles.domText}>Text: {domInfo.text || '—'}</Text>
        </View>
      )}

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
  domInspector: {
    backgroundColor: '#111',
    padding: 10,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  domText: {
    color: '#fff',
    fontSize: 12,
  },
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
