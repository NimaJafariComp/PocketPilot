import { buildInsightsViewModel } from "@pocketpilot/core";
import { useAuth, useData } from "@pocketpilot/services/src/react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Package,
  Send,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { AlertBanner } from "@/components/data/alert-banner";
import { EmptyStateCard } from "@/components/data/empty-state-card";
import { SectionCard } from "@/components/data/section-card";
import { SummaryStrip } from "@/components/data/summary-strip";
import { Screen } from "@/components/screen";
import { mobileServices } from "@/config/services";
import { formatCurrency } from "@/lib/format";
import { hapticSelect } from "@/lib/haptics";
import { useTabScrollPadding } from "@/lib/tab-scroll";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function InitialsAvatar({ name }: { name: string }) {
  const { colors } = useAppTheme();
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      className="h-10 w-10 items-center justify-center rounded-lg"
      style={{ backgroundColor: colors.secondary }}
    >
      <Text
        className="text-xs"
        style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
      >
        {initials}
      </Text>
    </View>
  );
}

function TypingIndicator() {
  const { colors } = useAppTheme();
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View className="self-start flex-row items-end gap-2">
      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary }}
      >
        <Sparkles size={13} color={colors.primaryForeground} strokeWidth={2.2} />
      </View>
      <View
        className="rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ backgroundColor: colors.muted }}
      >
        <View className="flex-row items-center gap-1" style={{ height: 16 }}>
          {dots.map((opacity, i) => (
            <Animated.View
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colors.mutedForeground, opacity }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const { transactions, ragSync } = useData();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const tabScrollPadding = useTabScrollPadding();
  const [tab, setTab] = useState<"summary" | "assistant">("summary");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  const insights = useMemo(() => buildInsightsViewModel(transactions), [transactions]);

  const examplePrompts = [
    {
      icon: <Info size={14} color={colors.mutedForeground} strokeWidth={2.2} />,
      text: "Why was last month expensive?",
    },
    {
      icon: <Activity size={14} color={colors.mutedForeground} strokeWidth={2.2} />,
      text: "Top 3 categories this month",
    },
    {
      icon: <Package size={14} color={colors.mutedForeground} strokeWidth={2.2} />,
      text: "How much did I spend on groceries in the last 30 days?",
    },
  ];

  async function handleSendMessage() {
    if (!input.trim() || isSending || !user || !ragSync.isChatAvailable) {
      return;
    }

    const userMessage = input.trim();
    const nextMessages: Message[] = [...messages, { role: "user", content: userMessage }];

    setInput("");
    setAssistantError("");
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const response = await mobileServices.rag.ask({
        query: userMessage,
        messages: nextMessages.slice(-8),
        topK: 12,
      });

      setMessages((current) => [...current, { role: "assistant", content: response.answer }]);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : "Assistant failed");
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 24, paddingTop: 16, paddingBottom: tabScrollPadding }}
      >
        <View className="flex-row gap-2">
          {(
            [
              ["assistant", "AI Assistant"],
              ["summary", "Summary"],
            ] as const
          ).map(([value, label]) => {
            const active = tab === value;
            return (
              <Pressable
                key={value}
                className="h-[36px] items-center justify-center rounded-full px-4"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                hitSlop={6}
                onPress={() => { hapticSelect(); setTab(value); }}
              >
                <Text
                  className="text-[14px]"
                  style={{
                    color: active ? colors.primaryForeground : colors.secondaryForeground,
                    fontFamily: fontFamilies.sans.semibold,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "summary" ? (
          <>
            <SummaryStrip
              eyebrow="Insights"
              tone="insights"
              items={[
                {
                  label: "This Month",
                  value: formatCurrency(insights.thisMonthSpent),
                  detail: `${insights.changePercent > 0 ? "+" : ""}${Math.round(insights.changePercent)}% vs last month`,
                  valueColor: insights.changePercent > 0 ? colors.danger : colors.foreground,
                },
                {
                  label: "Last Month",
                  value: formatCurrency(insights.lastMonthSpent),
                  detail: insights.previousMonthLabel,
                },
                {
                  label: "Transactions",
                  value: String(insights.thisMonthCount),
                  detail: "This month",
                },
              ]}
            />

            <SectionCard
              title="By Category"
              subtitle={insights.currentMonthLabel}
              eyebrow="Insights"
              tone="insights"
              badge="Category mix"
            >
              {insights.categoryData.length > 0 ? (
                <DonutChart
                  data={insights.categoryData.map((item, index) => ({
                    label: item.name,
                    value: item.value,
                    color: colors.chartPalette[index % colors.chartPalette.length],
                  }))}
                  centerValue={formatCurrency(insights.thisMonthSpent)}
                  centerLabel="total"
                />
              ) : (
                <EmptyStateCard
                  title="No data"
                  description="Monthly spending breakdown appears here once you have expense activity."
                />
              )}
            </SectionCard>

            <SectionCard
              title="Top Categories"
              subtitle={insights.currentMonthLabel}
              eyebrow="Insights"
              tone="insights"
              badge="Leaders"
            >
              {insights.categoryData.length > 0 ? (
                <HorizontalBarChart
                  data={insights.categoryData.map((item, index) => ({
                    name: item.name,
                    value: item.value,
                    color: colors.chartPalette[index % colors.chartPalette.length],
                  }))}
                  maxValue={insights.maxCategoryValue}
                />
              ) : (
                <EmptyStateCard
                  title="No data"
                  description="Top categories will appear after expenses are synced for the current month."
                />
              )}
            </SectionCard>

            {insights.changes.length > 0 ? (
              <SectionCard
                title="Notable Changes"
                subtitle="The biggest category swings versus last month."
                eyebrow="Signals"
                tone="insights"
                badge="Month over month"
              >
                <View className="gap-3">
                  {insights.changes.map((item) => {
                    const isUp = item.change > 0;
                    return (
                      <View
                        key={item.category}
                        className="flex-row items-start rounded-xl border px-4 py-4"
                        style={{ backgroundColor: colors.card, borderColor: colors.border }}
                      >
                        <View className="flex-1 flex-row items-center gap-3 pr-3">
                          <View
                            className="h-10 w-10 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: isUp
                                ? "rgba(213, 155, 47, 0.14)"
                                : "rgba(31, 157, 114, 0.14)",
                            }}
                          >
                            {isUp ? (
                              <ArrowUpRight size={18} color={colors.warning} strokeWidth={2.2} />
                            ) : (
                              <ArrowDownRight size={18} color={colors.success} strokeWidth={2.2} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-[14px]"
                              style={{
                                color: colors.foreground,
                                fontFamily: fontFamilies.sans.semibold,
                              }}
                            >
                              {item.category}
                            </Text>
                            <Text
                              className="mt-1 text-[12px] leading-5"
                              style={{
                                color: colors.mutedForeground,
                                fontFamily: fontFamilies.sans.regular,
                              }}
                            >
                              {isUp ? "+" : ""}
                              {formatCurrency(Math.abs(item.delta))} {isUp ? "more" : "less"} than
                              last month
                            </Text>
                          </View>
                        </View>
                        <View className="max-w-[42%] items-end gap-1 self-start">
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{
                              backgroundColor: isUp
                                ? "rgba(213, 155, 47, 0.14)"
                                : "rgba(31, 157, 114, 0.14)",
                            }}
                          >
                            <Text
                              className="text-[12px]"
                              style={{
                                color: isUp ? colors.warning : colors.success,
                                fontFamily: fontFamilies.sans.medium,
                              }}
                            >
                              {isUp ? "+" : ""}
                              {Math.round(item.change)}%
                            </Text>
                          </View>
                          <Text
                            className="text-right text-[12px] leading-5"
                            style={{
                              color: colors.mutedForeground,
                              fontFamily: fontFamilies.sans.regular,
                            }}
                          >
                            {formatCurrency(item.lastMonth)} → {formatCurrency(item.thisMonth)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </SectionCard>
            ) : null}

            {insights.recurringCharges.length > 0 ? (
              <SectionCard
                title="Recurring Charges"
                subtitle="Merchants that show up often in your history."
              >
                <View className="gap-3">
                  {insights.recurringCharges.map((charge) => (
                    <View
                      key={charge.merchant}
                      className="flex-row items-center justify-between rounded-xl border px-4 py-4"
                      style={{ backgroundColor: colors.card, borderColor: colors.border }}
                    >
                      <View className="flex-row items-center gap-3">
                        <InitialsAvatar name={charge.merchant} />
                        <View>
                          <Text
                            className="text-[14px]"
                            style={{
                              color: colors.foreground,
                              fontFamily: fontFamilies.sans.semibold,
                            }}
                          >
                            {charge.merchant}
                          </Text>
                          <Text
                            className="mt-1 text-[12px]"
                            style={{
                              color: colors.mutedForeground,
                              fontFamily: fontFamilies.sans.regular,
                            }}
                          >
                            {charge.count} transactions
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="text-[14px]"
                        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                      >
                        ~{formatCurrency(charge.avgAmount)}/mo
                      </Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            ) : null}
          </>
        ) : (
          <>
            {assistantError ? <AlertBanner tone="danger" message={assistantError} /> : null}

            {/* Sync progress — only while indexing */}
            {ragSync.status !== "idle" ? (
              <View className="rounded-2xl px-4 py-3 gap-2" style={{ backgroundColor: colors.card }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px]" style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
                    Syncing your data — chat unlocks when done.
                  </Text>
                  <Text className="text-[12px]" style={{ color: colors.primary, fontFamily: fontFamilies.sans.semibold }}>
                    {ragSync.progressPct}%
                  </Text>
                </View>
                <View className="h-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.muted }}>
                  <View className="h-full rounded-full" style={{ width: `${ragSync.progressPct}%`, backgroundColor: colors.primary }} />
                </View>
                {ragSync.lastError ? (
                  <Text className="text-[11px]" style={{ color: colors.danger, fontFamily: fontFamilies.sans.regular }}>
                    {ragSync.lastError}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Chat card */}
            <View className="overflow-hidden rounded-2xl" style={{ backgroundColor: colors.card }}>

              {/* Card header */}
              <View
                className="flex-row items-center gap-3 px-4 py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary }}>
                  <Sparkles size={17} color={colors.primaryForeground} strokeWidth={2.2} />
                </View>
                <View>
                  <Text className="text-[15px]" style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}>
                    Financial Assistant
                  </Text>
                  <Text className="text-[11px]" style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
                    Powered by your data
                  </Text>
                </View>
              </View>

              {/* Messages area */}
              <View className="px-4 pt-4 pb-3 gap-3">
                {messages.length === 0 ? (
                  <View className="gap-2">
                    <Text className="text-[13px] mb-1" style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}>
                      Try asking:
                    </Text>
                    {examplePrompts.map(({ icon, text }) => (
                      <Pressable
                        key={text}
                        className="flex-row items-center gap-3 rounded-xl px-4 py-3"
                        style={{ backgroundColor: colors.muted }}
                        onPress={() => setInput(text)}
                      >
                        {icon}
                        <Text className="flex-1 text-[14px]" style={{ color: colors.foreground, fontFamily: fontFamilies.sans.regular }}>
                          {text}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View className="gap-2">
                    {messages.map((message, index) => {
                      const isUser = message.role === "user";
                      return (
                        <View
                          key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
                          className={isUser ? "self-end items-end" : "self-start items-start flex-row gap-2"}
                          style={{ maxWidth: "85%" }}
                        >
                          {!isUser ? (
                            <View
                              className="mt-0.5 h-7 w-7 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: colors.primary }}
                            >
                              <Sparkles size={13} color={colors.primaryForeground} strokeWidth={2.2} />
                            </View>
                          ) : null}
                          <View
                            className={isUser ? "rounded-2xl rounded-tr-sm px-4 py-3" : "rounded-2xl rounded-tl-sm px-4 py-3"}
                            style={{ backgroundColor: isUser ? colors.primary : colors.muted }}
                          >
                            <Text
                              className="text-[14px] leading-[22px]"
                              style={{
                                color: isUser ? colors.primaryForeground : colors.foreground,
                                fontFamily: fontFamilies.sans.regular,
                              }}
                            >
                              {message.content}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                    {isSending ? <TypingIndicator /> : null}
                  </View>
                )}
              </View>

              {/* Input row — iMessage style pill */}
              <View className="px-3 pb-3">
                <View
                  className="flex-row items-end gap-2 rounded-2xl border px-3 py-2"
                  style={{ borderColor: colors.border, backgroundColor: colors.muted }}
                >
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder={
                      ragSync.isChatAvailable
                        ? "Message..."
                        : "Syncing — chat unlocks when finished."
                    }
                    placeholderTextColor={colors.mutedForeground}
                    editable={!isSending && !!user && ragSync.isChatAvailable}
                    multiline
                    className="flex-1 text-[15px] py-1"
                    style={{
                      color: colors.foreground,
                      fontFamily: fontFamilies.sans.regular,
                      maxHeight: 100,
                      textAlignVertical: "top",
                    }}
                  />
                  <Pressable
                    className="mb-0.5 h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: input.trim() && !isSending && !!user && ragSync.isChatAvailable
                        ? colors.primary
                        : colors.secondary,
                    }}
                    disabled={!input.trim() || isSending || !user || !ragSync.isChatAvailable}
                    onPress={handleSendMessage}
                  >
                    <Send
                      size={15}
                      color={
                        input.trim() && !isSending && !!user && ragSync.isChatAvailable
                          ? colors.primaryForeground
                          : colors.mutedForeground
                      }
                      strokeWidth={2.2}
                    />
                  </Pressable>
                </View>
              </View>

            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
