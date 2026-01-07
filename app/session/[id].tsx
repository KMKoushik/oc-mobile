import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useSessionsStore } from "@/lib/stores/sessions";
import { useModelsStore } from "@/lib/stores/models";
import { useAgentsStore } from "@/lib/stores/agents";
import {
  useSession,
  useSessionMessages,
  useSessionDiffs,
  useShareSession,
  useUnshareSession,
  useAbortSession,
  useSendPrompt,
  useModels,
  useAgents,
  type ModelInfo,
} from "@/lib/query";
import { MessageBubble } from "@/components/messages/message-bubble";
import type { Message, Part } from "@/lib/opencode/types";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { toast } from "@/lib/stores/toast";
import { primary, dark, colors, semantic } from "@/constants/theme";

function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const flatListRef = useRef<
    FlashListRef<{
      info: Message;
      parts: Part[];
    }>
  >(null);

  const [inputText, setInputText] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [showTasksModal, setShowTasksModal] = useState(false);

  // TanStack Query hooks
  const { data: session } = useSession(id);
  const { data: messagesData, isLoading: isLoadingMessages } =
    useSessionMessages(id);
  const { data: diffs } = useSessionDiffs(id);
  const { data: modelsData, isLoading: isLoadingModels } = useModels();
  const { data: agents = [] } = useAgents();

  const shareSessionMutation = useShareSession();
  const unshareSessionMutation = useUnshareSession();
  const abortSessionMutation = useAbortSession();
  const sendPromptMutation = useSendPrompt();

  // Local store for real-time updates (SSE)
  const currentSessionId = useSessionsStore((s) => s.currentSessionId);
  const currentMessages = useSessionsStore((s) => s.currentMessages);
  const currentTodos = useSessionsStore((s) => s.currentTodos);
  const currentStatus = useSessionsStore((s) => s.currentStatus);
  const setCurrentSession = useSessionsStore((s) => s.setCurrentSession);
  const clearCurrentSession = useSessionsStore((s) => s.clearCurrentSession);
  const initializeMessages = useSessionsStore((s) => s.initializeMessages);
  const initializeTodos = useSessionsStore((s) => s.initializeTodos);
  const initializeStatus = useSessionsStore((s) => s.initializeStatus);

  // Model/Agent preferences from stores
  const selectedModel = useModelsStore((s) => s.selectedModel);
  const setSelectedModel = useModelsStore((s) => s.setSelectedModel);
  const loadSelectedModel = useModelsStore((s) => s.loadSelectedModel);

  const selectedAgent = useAgentsStore((s) => s.selectedAgent);
  const setSelectedAgent = useAgentsStore((s) => s.setSelectedAgent);
  const loadSelectedAgent = useAgentsStore((s) => s.loadSelectedAgent);

  const models = modelsData?.models ?? [];
  const connectedProviderIds = modelsData?.connectedProviderIds ?? [];
  const primaryAgents = agents.filter((a) => a.mode === "primary");

  // Use current messages from store (real-time) or fallback to query data
  const messages =
    currentSessionId === id && currentMessages.length > 0
      ? currentMessages
      : (messagesData?.messages ?? []);
  const todos =
    currentSessionId === id ? currentTodos : (messagesData?.todos ?? []);
  const status =
    currentSessionId === id
      ? currentStatus
      : (messagesData?.status ?? { type: "idle" as const });
  const tokenCounts = messagesData?.tokenCounts ?? {
    input: 0,
    output: 0,
    total: 0,
  };

  const isBusy = status.type === "busy";
  const isShared = !!session?.share?.url;
  const shareUrl = session?.share?.url;

  // Get the model used in this session from the last assistant message
  const sessionModel = (() => {
    if (!messages.length) {
      return null;
    }
    // Find the last assistant message to get the model used
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i].info;
      if (msg.role === "assistant") {
        const assistantMsg = msg as unknown as {
          providerID?: string;
          modelID?: string;
        };
        if (assistantMsg.providerID && assistantMsg.modelID) {
          return `${assistantMsg.providerID}/${assistantMsg.modelID}`;
        }
      }
    }
    return null;
  })();

  // The model that will be used for the next message
  const nextMessageModel = selectedModel ?? sessionModel;
  const displayModel = sessionModel ?? selectedModel;
  const displayModelInfo = models.find((m) => m.id === displayModel);

  const displayModelName = (() => {
    if (displayModelInfo) return displayModelInfo.name;
    if (displayModel) {
      const [, ...modelParts] = displayModel.split("/");
      return modelParts.join("/") || displayModel;
    }
    return "Select model";
  })();

  // Filter models based on search query
  const filteredModels = modelSearchQuery.trim()
    ? models.filter((model) => {
        const query = modelSearchQuery.toLowerCase();
        return (
          model.name.toLowerCase().includes(query) ||
          model.providerName.toLowerCase().includes(query) ||
          model.modelId.toLowerCase().includes(query)
        );
      })
    : models;

  // Initialize session in store and sync with query data
  useEffect(() => {
    if (id) {
      setCurrentSession(id);
    }
    return () => {
      clearCurrentSession();
    };
  }, [id, setCurrentSession, clearCurrentSession]);

  // Sync query data to store for real-time updates
  useEffect(() => {
    if (messagesData && currentSessionId === id) {
      // Only initialize if store is empty (first load)
      if (currentMessages.length === 0) {
        initializeMessages(messagesData.messages);
        initializeTodos(messagesData.todos);
        initializeStatus(messagesData.status);
      }
    }
  }, [
    messagesData,
    id,
    currentSessionId,
    currentMessages.length,
    initializeMessages,
    initializeTodos,
    initializeStatus,
  ]);

  // Load preferences on mount
  useEffect(() => {
    loadSelectedModel();
    loadSelectedAgent();
  }, [loadSelectedModel, loadSelectedAgent]);

  const handleToggleShare = useCallback(async () => {
    if (!id) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (isShared) {
        await unshareSessionMutation.mutateAsync(id);
        toast.info("Session unshared");
      } else {
        const result = await shareSessionMutation.mutateAsync(id);
        if (result?.share?.url) {
          await Clipboard.setStringAsync(result.share.url);
          toast.success("Share link copied to clipboard");
        }
      }
    } catch (error) {
      console.error("Failed to toggle share:", error);
    }
  }, [id, isShared, shareSessionMutation, unshareSessionMutation]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(shareUrl);
    toast.success("Share link copied");
  }, [shareUrl]);

  const handleSelectModel = useCallback(
    (model: ModelInfo) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedModel(model.id);
      setShowModelPicker(false);
      setModelSearchQuery("");
    },
    [setSelectedModel],
  );

  const handleToggleModelPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowModelPicker((prev) => {
      if (prev) {
        setModelSearchQuery("");
      }
      return !prev;
    });
  }, []);

  const handleToggleAgent = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (primaryAgents.length < 2) return;

    const nextAgent = selectedAgent === "build" ? "plan" : "build";
    setSelectedAgent(nextAgent);
  }, [selectedAgent, setSelectedAgent, primaryAgents.length]);

  // Update navigation header with share button
  useEffect(() => {
    navigation.setOptions({
      title: session?.title || "Session",
      headerRight: () => (
        <View style={styles.headerRight}>
          {isShared && (
            <Pressable
              onPress={handleCopyShareLink}
              style={styles.headerButton}
              hitSlop={8}
            >
              <IconSymbol
                name="doc.on.doc"
                size={20}
                color={isDark ? primary[400] : primary[500]}
              />
            </Pressable>
          )}
          <Pressable
            onPress={handleToggleShare}
            style={styles.headerButton}
            hitSlop={8}
          >
            <IconSymbol
              name={isShared ? "link" : "square.and.arrow.up"}
              size={20}
              color={
                isShared ? semantic.success : isDark ? dark[400] : dark[500]
              }
            />
          </Pressable>
        </View>
      ),
    });
  }, [
    session?.title,
    isShared,
    isDark,
    navigation,
    handleCopyShareLink,
    handleToggleShare,
  ]);

  const handleSend = async () => {
    if (!inputText.trim() || !id) return;

    const text = inputText.trim();
    setInputText("");
    setShowModelPicker(false);

    try {
      await sendPromptMutation.mutateAsync({
        sessionId: id,
        text,
        modelId: nextMessageModel ?? undefined,
        agent: selectedAgent,
      });
    } catch (error) {
      console.error("Failed to send prompt:", error);
    }
  };

  const handleAbort = async () => {
    if (id) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await abortSessionMutation.mutateAsync(id);
        toast.info("Session aborted");
      } catch (error) {
        console.error("Failed to abort session:", error);
      }
    }
  };

  // Track if user has manually scrolled away from bottom
  const userScrolledAwayRef = useRef(false);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length && !userScrolledAwayRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        layoutMeasurement: { height: number };
        contentSize: { height: number };
      };
    }) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (distanceFromBottom > 200) {
        userScrolledAwayRef.current = true;
      } else if (distanceFromBottom < 50) {
        userScrolledAwayRef.current = false;
      }
    },
    [],
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: { info: Message; parts: Part[] } }) => (
      <MessageBubble message={item.info} parts={item.parts} />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: { info: Message; parts: Part[] }) => item.info.id,
    [],
  );

  if (!session && isLoadingMessages) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          isDark && styles.containerDark,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#fff" : primary[500]}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, isDark && styles.containerDark]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      {/* Messages list */}
      <FlashList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderMessageItem}
        contentContainerStyle={{ paddingVertical: 16 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        drawDistance={500}
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 100,
        }}
        ListEmptyComponent={
          !isLoadingMessages ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                Start a conversation by sending a message
              </Text>
            </View>
          ) : null
        }
      />

      {/* Tasks Modal */}
      <Modal
        visible={showTasksModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTasksModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTasksModal(false)}
        >
          <Pressable
            style={[styles.modalContent, isDark && styles.modalContentDark]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, isDark && styles.modalTitleDark]}
              >
                Tasks ({todos.filter((t) => t.status === "completed").length}/
                {todos.length})
              </Text>
              <Pressable onPress={() => setShowTasksModal(false)} hitSlop={8}>
                <IconSymbol
                  name="xmark"
                  size={20}
                  color={isDark ? dark[400] : dark[500]}
                />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {todos.map((todo) => (
                <View key={todo.id} style={styles.todoItem}>
                  <View
                    style={[
                      styles.todoDot,
                      todo.status === "completed" && styles.todoDotCompleted,
                      todo.status === "in_progress" && styles.todoDotInProgress,
                      todo.status !== "completed" &&
                        todo.status !== "in_progress" &&
                        styles.todoDotPending,
                      todo.status !== "completed" &&
                        todo.status !== "in_progress" &&
                        isDark &&
                        styles.todoDotPendingDark,
                    ]}
                  />
                  <Text
                    style={[
                      styles.todoText,
                      todo.status === "completed" && styles.todoTextCompleted,
                      todo.status !== "completed" && styles.todoTextActive,
                      todo.status !== "completed" &&
                        isDark &&
                        styles.todoTextActiveDark,
                    ]}
                  >
                    {todo.content}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Model picker dropdown */}
      {showModelPicker && (
        <View
          style={[
            styles.modelPickerContainer,
            isDark && styles.modelPickerContainerDark,
          ]}
        >
          {isLoadingModels ? (
            <View style={styles.modelPickerEmpty}>
              <ActivityIndicator
                size="small"
                color={isDark ? "#fff" : primary[500]}
              />
              <Text
                style={[
                  styles.modelPickerEmptyText,
                  isDark && styles.modelPickerEmptyTextDark,
                ]}
              >
                Loading models...
              </Text>
            </View>
          ) : models.length === 0 ? (
            <View style={styles.modelPickerEmpty}>
              <Text
                style={[
                  styles.modelPickerEmptyText,
                  isDark && styles.modelPickerEmptyTextDark,
                ]}
              >
                {connectedProviderIds.length === 0
                  ? "No providers connected. Connect a provider in OpenCode to use models."
                  : "No models available from connected providers."}
              </Text>
            </View>
          ) : (
            <>
              {/* Search input */}
              <View
                style={[
                  styles.modelSearchContainer,
                  isDark && styles.modelSearchContainerDark,
                ]}
              >
                <IconSymbol
                  name="magnifyingglass"
                  size={16}
                  color={isDark ? dark[400] : dark[500]}
                />
                <TextInput
                  value={modelSearchQuery}
                  onChangeText={setModelSearchQuery}
                  placeholder="Search models..."
                  placeholderTextColor={isDark ? dark[500] : dark[400]}
                  style={[
                    styles.modelSearchInput,
                    isDark && styles.modelSearchInputDark,
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {modelSearchQuery.length > 0 && (
                  <Pressable
                    onPress={() => setModelSearchQuery("")}
                    hitSlop={8}
                  >
                    <IconSymbol
                      name="xmark.circle.fill"
                      size={18}
                      color={isDark ? dark[500] : dark[400]}
                    />
                  </Pressable>
                )}
              </View>

              {/* Model list */}
              <ScrollView
                style={styles.modelPickerScroll}
                contentContainerStyle={styles.modelPickerScrollContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {filteredModels.length === 0 ? (
                  <View style={styles.modelPickerEmpty}>
                    <Text
                      style={[
                        styles.modelPickerEmptyText,
                        isDark && styles.modelPickerEmptyTextDark,
                      ]}
                    >
                      No models match &ldquo;{modelSearchQuery}&rdquo;
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modelListContainer}>
                    {filteredModels.map((model) => {
                      const isActive = model.id === nextMessageModel;
                      return (
                        <Pressable
                          key={model.id}
                          onPress={() => handleSelectModel(model)}
                          style={({ pressed }) => [
                            styles.modelOption,
                            isDark && styles.modelOptionDark,
                            pressed && styles.modelOptionPressed,
                            pressed && isDark && styles.modelOptionPressedDark,
                            isActive && styles.modelOptionSelected,
                            isActive &&
                              isDark &&
                              styles.modelOptionSelectedDark,
                          ]}
                        >
                          <View style={styles.modelOptionContent}>
                            <Text
                              style={[
                                styles.modelOptionName,
                                isDark && styles.modelOptionNameDark,
                                isActive && styles.modelOptionNameSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {model.name}
                            </Text>
                            <Text
                              style={[
                                styles.modelOptionProvider,
                                isDark && styles.modelOptionProviderDark,
                              ]}
                              numberOfLines={1}
                            >
                              {model.providerName}
                            </Text>
                          </View>
                          {isActive && (
                            <IconSymbol
                              name="checkmark"
                              size={18}
                              color={primary[500]}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
        {/* Tasks, Files and Token count row - above input */}
        {(todos.length > 0 ||
          (diffs && diffs.length > 0) ||
          tokenCounts.total > 0) && (
          <View style={styles.aboveInputRow}>
            {/* Tasks and Files buttons - left side */}
            <View style={styles.aboveInputButtons}>
              {/* Tasks button */}
              {todos.length > 0 && (
                <Pressable
                  onPress={() => setShowTasksModal(true)}
                  style={({ pressed }) => [
                    styles.tasksButton,
                    isDark && styles.tasksButtonDark,
                    pressed && { opacity: 0.7 },
                  ]}
                  hitSlop={4}
                >
                  <View style={styles.tasksButtonRow}>
                    <View style={styles.tasksButtonIcon}>
                      <IconSymbol
                        name="checkmark.circle.fill"
                        size={14}
                        color={isDark ? primary[400] : primary[600]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.tasksButtonText,
                        isDark && styles.tasksButtonTextDark,
                      ]}
                    >
                      {`Tasks (${todos.filter((t) => t.status === "completed").length}/${todos.length})`}
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Files button */}
              {diffs && diffs.length > 0 && (
                <Pressable
                  onPress={() => router.push(`/session/files/${id}`)}
                  style={({ pressed }) => [
                    styles.filesButton,
                    isDark && styles.filesButtonDark,
                    pressed && { opacity: 0.7 },
                  ]}
                  hitSlop={4}
                >
                  <View style={styles.tasksButtonRow}>
                    <View style={styles.tasksButtonIcon}>
                      <IconSymbol
                        name="doc.text"
                        size={14}
                        color={isDark ? colors.green[400] : colors.green[600]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.filesButtonText,
                        isDark && styles.filesButtonTextDark,
                      ]}
                    >
                      {`Files (${diffs.length})`}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Token count - right side */}
            {tokenCounts.total > 0 && (
              <View
                style={[
                  styles.tokenCountBadge,
                  isDark && styles.tokenCountBadgeDark,
                ]}
              >
                <IconSymbol
                  name="number"
                  size={12}
                  color={isDark ? dark[400] : dark[500]}
                />
                <Text
                  style={[
                    styles.tokenCountText,
                    isDark && styles.tokenCountTextDark,
                  ]}
                >
                  {formatTokenCount(tokenCounts.total)} tokens
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Input container with everything inside */}
        <View
          style={[styles.inputContainer, isDark && styles.inputContainerDark]}
        >
          {/* Selector row for model and agent */}
          <View style={styles.selectorRow}>
            {/* Model selector */}
            <Pressable
              onPress={handleToggleModelPicker}
              style={({ pressed }) => [
                styles.modelSelector,
                isDark && styles.modelSelectorDark,
                pressed && styles.modelSelectorPressed,
                pressed && isDark && styles.modelSelectorPressedDark,
              ]}
              hitSlop={4}
            >
              <View style={styles.modelSelectorRow}>
                <View style={styles.modelSelectorIcon}>
                  <IconSymbol
                    name="cpu"
                    size={16}
                    color={isDark ? dark[400] : dark[500]}
                  />
                </View>
                <Text
                  style={[
                    styles.modelSelectorText,
                    isDark && styles.modelSelectorTextDark,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayModelName}
                </Text>
                <View style={styles.modelSelectorIcon}>
                  <IconSymbol
                    name={showModelPicker ? "chevron.up" : "chevron.down"}
                    size={14}
                    color={isDark ? dark[400] : dark[500]}
                  />
                </View>
              </View>
            </Pressable>

            {/* Agent toggle */}
            <Pressable
              onPress={handleToggleAgent}
              style={({ pressed }) => [
                styles.agentToggle,
                isDark && styles.agentToggleDark,
                selectedAgent === "plan" && styles.agentTogglePlan,
                selectedAgent === "plan" &&
                  isDark &&
                  styles.agentTogglePlanDark,
                pressed && styles.agentTogglePressed,
                pressed && isDark && styles.agentTogglePressedDark,
              ]}
              hitSlop={4}
            >
              <View style={styles.agentToggleRow}>
                <IconSymbol
                  name={selectedAgent === "plan" ? "doc.text" : "hammer"}
                  size={14}
                  color={
                    selectedAgent === "plan"
                      ? isDark
                        ? colors.amber[400]
                        : colors.amber[600]
                      : isDark
                        ? primary[400]
                        : primary[600]
                  }
                />
                <Text
                  style={[
                    styles.agentToggleText,
                    isDark && styles.agentToggleTextDark,
                    selectedAgent === "plan" && styles.agentToggleTextPlan,
                    selectedAgent === "plan" &&
                      isDark &&
                      styles.agentToggleTextPlanDark,
                  ]}
                >
                  {selectedAgent}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Text input row with send button */}
          <View style={styles.inputRow}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Send a message..."
              placeholderTextColor={isDark ? dark[500] : dark[400]}
              multiline
              style={[styles.input, isDark && styles.inputDark]}
              onFocus={() => setShowModelPicker(false)}
            />

            {/* Send/Abort button */}
            {isBusy ? (
              <Pressable
                onPress={handleAbort}
                style={({ pressed }) => [
                  styles.sendButton,
                  styles.abortButton,
                  pressed && styles.abortButtonPressed,
                ]}
              >
                <IconSymbol name="xmark" size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim()}
                style={({ pressed }) => [
                  styles.sendButton,
                  inputText.trim()
                    ? styles.sendButtonActive
                    : styles.sendButtonDisabled,
                  inputText.trim() && isDark && styles.sendButtonActiveDark,
                  !inputText.trim() && isDark && styles.sendButtonDisabledDark,
                  inputText.trim() && pressed && styles.sendButtonPressed,
                ]}
              >
                <IconSymbol
                  name="paperplane.fill"
                  size={18}
                  color={
                    inputText.trim() ? "#fff" : isDark ? dark[500] : dark[400]
                  }
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  containerDark: {
    backgroundColor: dark[900],
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    textAlign: "center",
    color: dark[500],
  },
  emptyTextDark: {
    color: dark[400],
  },
  // Tasks modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    maxHeight: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#fff",
    paddingBottom: 32,
  },
  modalContentDark: {
    backgroundColor: dark[800],
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: dark[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: dark[900],
  },
  modalTitleDark: {
    color: "#fff",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  // Row container for tasks, files and token count above input
  aboveInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  // Container for tasks and files buttons
  aboveInputButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Tasks button
  tasksButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: primary[100],
  },
  tasksButtonDark: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  tasksButtonRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  tasksButtonIcon: {
    flexShrink: 0,
  },
  tasksButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: primary[600],
  },
  tasksButtonTextDark: {
    color: primary[400],
  },
  // Files button
  filesButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  filesButtonDark: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  filesButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.green[600],
  },
  filesButtonTextDark: {
    color: colors.green[400],
  },
  // Token count badge - right side
  tokenCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: dark[100],
  },
  tokenCountBadgeDark: {
    backgroundColor: dark[800],
  },
  tokenCountText: {
    fontSize: 12,
    fontWeight: "500",
    color: dark[500],
  },
  tokenCountTextDark: {
    color: dark[400],
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  todoDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: 5,
  },
  todoDotCompleted: {
    backgroundColor: colors.green[500],
  },
  todoDotInProgress: {
    backgroundColor: primary[500],
  },
  todoDotPending: {
    backgroundColor: dark[300],
  },
  todoDotPendingDark: {
    backgroundColor: dark[600],
  },
  todoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  todoTextCompleted: {
    color: dark[400],
    textDecorationLine: "line-through",
  },
  todoTextActive: {
    color: dark[700],
  },
  todoTextActiveDark: {
    color: dark[300],
  },

  // Model picker styles
  modelPickerContainer: {
    maxHeight: 280,
    borderTopWidth: 1,
    borderTopColor: dark[200],
    backgroundColor: "#fff",
  },
  modelPickerContainerDark: {
    borderTopColor: dark[700],
    backgroundColor: dark[800],
  },
  modelPickerScroll: {
    flexGrow: 1,
  },
  modelPickerScrollContent: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  modelListContainer: {
    gap: 8,
  },
  modelSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dark[200],
    backgroundColor: dark[50],
  },
  modelSearchContainerDark: {
    borderBottomColor: dark[700],
    backgroundColor: dark[900],
  },
  modelSearchInput: {
    flex: 1,
    fontSize: 15,
    color: dark[900],
    paddingVertical: 6,
  },
  modelSearchInputDark: {
    color: "#fff",
  },
  modelPickerEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },
  modelPickerEmptyText: {
    textAlign: "center",
    fontSize: 14,
    color: dark[500],
  },
  modelPickerEmptyTextDark: {
    color: dark[400],
  },
  modelOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: dark[50],
  },
  modelOptionDark: {
    backgroundColor: dark[700],
  },
  modelOptionPressed: {
    backgroundColor: dark[100],
  },
  modelOptionPressedDark: {
    backgroundColor: dark[700],
  },
  modelOptionSelected: {
    backgroundColor: primary[50],
  },
  modelOptionSelectedDark: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  modelOptionContent: {
    flex: 1,
    marginRight: 8,
  },
  modelOptionName: {
    fontSize: 15,
    fontWeight: "500",
    color: dark[900],
  },
  modelOptionNameDark: {
    color: "#fff",
  },
  modelOptionNameSelected: {
    color: primary[600],
  },
  modelOptionProvider: {
    marginTop: 2,
    fontSize: 12,
    color: dark[500],
  },
  modelOptionProviderDark: {
    color: dark[400],
  },
  // Input wrapper
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: dark[200],
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  inputWrapperDark: {
    borderTopColor: dark[800],
    backgroundColor: dark[900],
  },
  // Input container - holds everything: selectors, input, and send button
  inputContainer: {
    borderRadius: 24,
    backgroundColor: dark[100],
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputContainerDark: {
    backgroundColor: dark[800],
  },
  // Model selector - inline pill button
  modelSelector: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: dark[200],
  },
  // Row inside model selector for horizontal layout
  modelSelectorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  modelSelectorDark: {
    backgroundColor: dark[700],
  },
  modelSelectorPressed: {
    backgroundColor: dark[300],
  },
  modelSelectorPressedDark: {
    backgroundColor: dark[600],
  },
  modelSelectorText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
    color: dark[600],
  },
  modelSelectorTextDark: {
    color: dark[300],
  },
  modelSelectorIcon: {
    flexShrink: 0,
  },
  // Selector row - holds model selector and agent toggle
  selectorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 8,
  },
  // Agent toggle - pill button to switch between plan/build
  agentToggle: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: primary[100],
  },
  agentToggleDark: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  agentTogglePlan: {
    backgroundColor: colors.amber[100],
  },
  agentTogglePlanDark: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
  },
  agentTogglePressed: {
    backgroundColor: primary[200],
  },
  agentTogglePressedDark: {
    backgroundColor: "rgba(99, 102, 241, 0.3)",
  },
  agentToggleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  agentToggleText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: primary[600],
    textTransform: "capitalize" as const,
  },
  agentToggleTextDark: {
    color: primary[400],
  },
  agentToggleTextPlan: {
    color: colors.amber[600],
  },
  agentToggleTextPlanDark: {
    color: colors.amber[400],
  },
  // Input row - holds text input and send button
  inputRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 8,
  },
  // Text input
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 150,
    fontSize: 17,
    lineHeight: 24,
    color: dark[900],
    paddingVertical: 4,
    textAlignVertical: "top",
  },
  inputDark: {
    color: "#fff",
  },
  // Send button - smaller to fit inside input container
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  sendButtonActive: {
    backgroundColor: primary[500],
  },
  sendButtonActiveDark: {
    backgroundColor: primary[500],
  },
  sendButtonDisabled: {
    backgroundColor: dark[200],
  },
  sendButtonDisabledDark: {
    backgroundColor: dark[700],
  },
  sendButtonPressed: {
    backgroundColor: primary[600],
  },
  abortButton: {
    backgroundColor: colors.red[500],
  },
  abortButtonPressed: {
    backgroundColor: colors.red[600],
  },
});
