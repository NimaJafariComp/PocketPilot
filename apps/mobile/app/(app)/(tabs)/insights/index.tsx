import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Package,
  Repeat,
  Send,
  Sparkles,
} from 'lucide-react-native';
import { buildInsightsViewModel } from '@pocketpilot/core';
import { useAuth, useData } from '@pocketpilot/services/src/react';
import { AlertBanner } from '@/components/data/alert-banner';
import { DonutChart } from '@/components/charts/donut-chart';
import { EmptyStateCard } from '@/components/data/empty-state-card';
import { HorizontalBarChart } from '@/components/charts/horizontal-bar-chart';
import { Screen } from '@/components/screen';
import { useTabScrollPadding } from '@/lib/tab-scroll';
import { SectionCard } from '@/components/data/section-card';
import { SummaryStrip } from '@/components/data/summary-strip';
import { mobileServices } from '@/config/services';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { formatCurrency } from '@/lib/format';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function InitialsAvatar({ name }: { name: string }) {
  const { colors } = useAppTheme();
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
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

export default function InsightsScreen() {
  const { transactions, ragSync } = useData();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const tabScrollPadding = useTabScrollPadding();
  const [tab, setTab] = useState<'summary' | 'assistant'>('summary');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [assistantError, setAssistantError] = useState('');

  const insights = useMemo(() => buildInsightsViewModel(transactions), [transactions]);

  const examplePrompts = [
    { icon: <Info size={14} color={colors.mutedForeground} strokeWidth={2.2} />, text: 'Why was last month expensive?' },
    { icon: <Activity size={14} color={colors.mutedForeground} strokeWidth={2.2} />, text: 'Top 3 categories this month' },
    { icon: <Package size={14} color={colors.mutedForeground} strokeWidth={2.2} />, text: 'How much did I spend on groceries in the last 30 days?' },
  ];

  async function handleSendMessage() {
    if (!input.trim() || isSending || !user || !ragSync.isChatAvailable) {
      return;
    }

    const userMessage = input.trim();
    const nextMessages: Message[] = [...messages, { role: 'user', content: userMessage }];

    setInput('');
    setAssistantError('');
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const response = await mobileServices.rag.ask({
        query: userMessage,
        messages: nextMessages.slice(-8),
        topK: 12,
      });

      setMessages((current) => [...current, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Assistant failed');
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not answer right now. Check Ollama, Functions, and Qdrant, then try again.',
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
        contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: tabScrollPadding }}
      >
        <View className="flex-row gap-2">
          {([
            ['summary', 'Summary'],
            ['assistant', 'AI Assistant'],
          ] as const).map(([value, label]) => {
            const active = tab === value;
            return (
              <Pressable
                key={value}
                className="rounded-full px-4 py-2.5"
                style={{ backgroundColor: active ? colors.primary : colors.secondary }}
                onPress={() => setTab(value)}
              >
                <Text
                  className="text-sm"
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

        {tab === 'summary' ? (
          <>
            <SummaryStrip
              eyebrow="Insights"
              tone="insights"
              items={[
                {
                  label: 'This Month',
                  value: formatCurrency(insights.thisMonthSpent),
                  detail: `${insights.changePercent > 0 ? '+' : ''}${Math.round(insights.changePercent)}% vs last month`,
                  valueColor: insights.changePercent > 0 ? colors.danger : colors.foreground,
                },
                {
                  label: 'Last Month',
                  value: formatCurrency(insights.lastMonthSpent),
                  detail: insights.previousMonthLabel,
                },
                {
                  label: 'Transactions',
                  value: String(insights.thisMonthCount),
                  detail: 'This month',
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
                <EmptyStateCard title="No data" description="Monthly spending breakdown appears here once you have expense activity." />
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
                <EmptyStateCard title="No data" description="Top categories will appear after expenses are synced for the current month." />
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
                            style={{ backgroundColor: isUp ? 'rgba(213, 155, 47, 0.14)' : 'rgba(31, 157, 114, 0.14)' }}
                          >
                            {isUp ? (
                              <ArrowUpRight size={18} color={colors.warning} strokeWidth={2.2} />
                            ) : (
                              <ArrowDownRight size={18} color={colors.success} strokeWidth={2.2} />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-sm"
                              style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                            >
                              {item.category}
                            </Text>
                            <Text
                              className="mt-1 text-xs leading-5"
                              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                            >
                              {isUp ? '+' : ''}{formatCurrency(Math.abs(item.delta))} {isUp ? 'more' : 'less'} than last month
                            </Text>
                          </View>
                        </View>
                        <View className="max-w-[42%] items-end gap-1 self-start">
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{ backgroundColor: isUp ? 'rgba(213, 155, 47, 0.14)' : 'rgba(31, 157, 114, 0.14)' }}
                          >
                            <Text
                              className="text-[11px]"
                              style={{
                                color: isUp ? colors.warning : colors.success,
                                fontFamily: fontFamilies.sans.medium,
                              }}
                            >
                              {isUp ? '+' : ''}{Math.round(item.change)}%
                            </Text>
                          </View>
                          <Text
                            className="text-right text-xs leading-5"
                            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
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
              <SectionCard title="Recurring Charges" subtitle="Merchants that show up often in your history.">
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
                            className="text-sm"
                            style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
                          >
                            {charge.merchant}
                          </Text>
                          <Text
                            className="mt-1 text-xs"
                            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                          >
                            {charge.count} transactions
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="text-sm"
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
            <AlertBanner
              tone="neutral"
              message="Powered by local Ollama + Qdrant RAG. Your data stays on your machine."
              icon={<Info size={16} color={colors.foreground} strokeWidth={2.2} />}
            />

            {assistantError ? <AlertBanner tone="danger" message={assistantError} /> : null}

            {ragSync.status !== 'idle' ? (
              <SectionCard title="Insights Sync" subtitle={ragSync.statusText}>
                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-xs"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      Chat unlocks automatically when the sync finishes.
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
                    >
                      {ragSync.progressPct}%
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: colors.muted }}>
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${ragSync.progressPct}%`, backgroundColor: colors.primary }}
                    />
                  </View>
                  {ragSync.lastError ? (
                    <Text
                      className="text-xs"
                      style={{ color: colors.danger, fontFamily: fontFamilies.sans.regular }}
                    >
                      {ragSync.lastError}
                    </Text>
                  ) : null}
                </View>
              </SectionCard>
            ) : null}

            <SectionCard title="Financial Assistant" subtitle="Ask about trends, categories, or recurring merchants in plain language.">
              <View className="gap-4">
                {messages.length === 0 ? (
                  <View className="items-center gap-3 py-3">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-lg"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Sparkles size={20} color={colors.primaryForeground} strokeWidth={2.2} />
                    </View>
                    <Text
                      className="text-base tracking-tight"
                      style={{ color: colors.foreground, fontFamily: fontFamilies.serif.semibold }}
                    >
                      Financial Assistant
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      Ask anything about your spending patterns.
                    </Text>
                    <View className="w-full gap-2">
                      {examplePrompts.map(({ icon, text }) => (
                        <Pressable
                          key={text}
                          className="flex-row items-center gap-2 rounded-lg border px-4 py-3"
                          style={{ borderColor: colors.border, backgroundColor: colors.card }}
                          onPress={() => setInput(text)}
                        >
                          {icon}
                          <Text
                            className="flex-1 text-sm"
                            style={{ color: colors.foreground, fontFamily: fontFamilies.sans.regular }}
                          >
                            {text}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View className="gap-3">
                    {messages.map((message, index) => {
                      const isUser = message.role === 'user';
                      return (
                        <View
                          key={`${message.role}-${index}-${message.content.slice(0, 20)}`}
                          className={isUser ? 'self-end' : 'self-start'}
                          style={{ maxWidth: '88%' }}
                        >
                          <View className="flex-row gap-2">
                            {!isUser ? (
                              <View
                                className="mt-0.5 h-7 w-7 items-center justify-center rounded-lg"
                                style={{ backgroundColor: colors.primary }}
                              >
                                <Sparkles size={14} color={colors.primaryForeground} strokeWidth={2.2} />
                              </View>
                            ) : null}
                            <View
                              className="rounded-xl px-4 py-3"
                              style={{ backgroundColor: isUser ? colors.primary : colors.muted }}
                            >
                              <Text
                                className="text-sm leading-6"
                                style={{
                                  color: isUser ? colors.primaryForeground : colors.foreground,
                                  fontFamily: fontFamilies.sans.regular,
                                }}
                              >
                                {message.content}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                    {isSending ? (
                      <View className="self-start flex-row gap-2">
                        <View
                          className="mt-0.5 h-7 w-7 items-center justify-center rounded-lg"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Sparkles size={14} color={colors.primaryForeground} strokeWidth={2.2} />
                        </View>
                        <View className="rounded-xl px-4 py-3" style={{ backgroundColor: colors.muted }}>
                          <Text
                            className="text-sm"
                            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                          >
                            Thinking...
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}

                <View className="gap-3">
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder={
                      ragSync.isChatAvailable
                        ? 'Ask about your spending...'
                        : 'Syncing insights index. Chat will unlock when finished.'
                    }
                    placeholderTextColor={colors.mutedForeground}
                    editable={!isSending && !!user && ragSync.isChatAvailable}
                    multiline
                    className="min-h-[104px] rounded-xl border px-4 py-4 text-base"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      color: colors.foreground,
                      textAlignVertical: 'top',
                      fontFamily: fontFamilies.sans.regular,
                    }}
                  />
                  <Pressable
                    className="flex-row items-center justify-center gap-2 rounded-xl px-4 py-4"
                    style={{
                      backgroundColor: colors.primary,
                      opacity: !input.trim() || isSending || !user || !ragSync.isChatAvailable ? 0.6 : 1,
                    }}
                    disabled={!input.trim() || isSending || !user || !ragSync.isChatAvailable}
                    onPress={handleSendMessage}
                  >
                    <Send size={16} color={colors.primaryForeground} strokeWidth={2.2} />
                    <Text
                      className="text-sm"
                      style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
                    >
                      {isSending ? 'Sending...' : 'Ask Assistant'}
                    </Text>
                  </Pressable>

                  {!user ? (
                    <Text
                      className="text-xs"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      Connecting to local auth...
                    </Text>
                  ) : null}
                  {user && !ragSync.isChatAvailable ? (
                    <Text
                      className="text-xs"
                      style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
                    >
                      Please wait for sync to finish before chatting.
                    </Text>
                  ) : null}
                </View>
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
