import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface Section {
  id: string;
  title: string;
  emoji: string;
  content: string;
}

const SECTIONS: Section[] = [
  {
    id: 'deposit',
    title: 'Security Deposit Rules',
    emoji: '💰',
    content: `Security deposits protect landlords from damage or unpaid rent, but strict rules govern how they're handled.

**Limits:** Most states cap security deposits at 1–2 months' rent. Check your state's specific limit.

**Itemization:** Landlords must provide an itemized list of deductions within a deadline (usually 14–30 days after move-out) along with receipts or invoices for repairs.

**Return timeline:** Depending on your state, landlords must return the deposit within 14–45 days. Failure to meet this deadline may entitle you to double or triple the deposit amount plus legal fees.

**Normal wear and tear:** Landlords CANNOT deduct for normal wear and tear — minor scuffs, small nail holes, or carpet wear over time. Only actual damage beyond normal use is deductible.

**Document everything:** Take photos and video at move-in and move-out. Send a written move-out notice and request a walk-through inspection.`,
  },
  {
    id: 'notice',
    title: 'Notice Requirements',
    emoji: '📬',
    content: `Both landlords and tenants must give proper notice before making significant changes to a tenancy.

**Rent increases:** Landlords typically must give 30–60 days written notice before raising rent. Some jurisdictions require 90 days for increases over 10%.

**Entry notice:** In most states, landlords must give 24–48 hours notice before entering your unit, except in genuine emergencies.

**Termination notice:** Month-to-month tenancies usually require 30 days notice to end the tenancy. Fixed-term leases end automatically at expiration unless renewed.

**Lease non-renewal:** Many jurisdictions require landlords to give written notice (30–90 days) if they choose not to renew a lease.

**How to give notice:** Always give notice in writing via certified mail or email with read receipts. Keep copies of all correspondence.`,
  },
  {
    id: 'habitability',
    title: 'Habitability Rights',
    emoji: '🏠',
    content: `Every tenant has the right to a habitable rental unit — this is the implied warranty of habitability.

**What landlords must provide:**
• Weatherproof roof and walls
• Working plumbing, heat, and electricity
• Hot and cold running water
• Protection from pests and rodents
• Smoke and carbon monoxide detectors
• Safe common areas

**Repair and deduct:** In many states, if a landlord fails to make essential repairs after written notice (typically 30 days), tenants may hire a contractor and deduct the cost from rent.

**Rent withholding:** Some states allow tenants to withhold rent or pay into an escrow account until repairs are made. Always consult a local attorney before withholding rent.

**Document issues:** Always report repair requests in writing and keep copies. This creates a paper trail if disputes arise.`,
  },
  {
    id: 'eviction',
    title: 'Eviction Process Basics',
    emoji: '⚖️',
    content: `Eviction is a legal process — landlords CANNOT remove you without going through the court system.

**Illegal evictions:** Landlords cannot change locks, remove your belongings, shut off utilities, or threaten you to force you out. These "self-help" evictions are illegal in every state.

**Notice to quit:** Before filing for eviction, landlords must serve written notice — typically 3–5 days for nonpayment, 30 days for lease violations, or 30–60 days for no-fault termination.

**Court process:** If you don't comply with the notice, the landlord files an eviction lawsuit (called unlawful detainer). You have the right to appear in court and present your defense.

**Judgment and lockout:** Only after a court judgment can a sheriff or marshal legally remove you. This process typically takes 2–6 weeks minimum.

**Your defenses:** Common defenses include: landlord failed to maintain habitability, landlord didn't follow proper notice procedures, or retaliation for exercising legal rights.`,
  },
  {
    id: 'discrimination',
    title: 'Fair Housing & Discrimination',
    emoji: '🛡️',
    content: `The Fair Housing Act prohibits housing discrimination based on protected characteristics.

**Federal protected classes:**
• Race, color, national origin
• Religion
• Sex (includes gender identity and sexual orientation in many states)
• Familial status (families with children)
• Disability

**State and local protections:** Many states and cities add additional protected classes such as source of income, marital status, age, or student status.

**What's prohibited:** Refusing to rent, charging higher rent, providing different terms, or harassment based on protected characteristics.

**Reasonable accommodations:** Landlords must make reasonable accommodations for tenants with disabilities, including allowing service animals even in "no pets" buildings.

**Filing a complaint:** Contact HUD (1-800-669-9777) or your local Fair Housing agency within one year of the discriminatory act.`,
  },
  {
    id: 'retaliation',
    title: 'Retaliation Protections',
    emoji: '🔒',
    content: `Tenants are protected from retaliation when they exercise their legal rights.

**Protected actions include:**
• Reporting housing code violations to government agencies
• Requesting repairs
• Organizing a tenant union
• Withholding rent (where legally permitted)
• Filing a complaint about habitability

**Forms of retaliation:** Rent increases, eviction attempts, service reductions, or harassment following a protected action may constitute illegal retaliation.

**Presumption of retaliation:** If a landlord takes adverse action within 90–180 days of a tenant's protected activity, many states presume it's retaliatory — placing the burden on the landlord to prove otherwise.

**Document your actions:** Keep written records of all repair requests, complaints filed, and landlord responses with dates. This is critical evidence if you need to assert a retaliation defense.

**Consult an attorney:** If you suspect retaliation, consult a local tenant rights attorney or legal aid organization.`,
  },
];

export default function TenantRightsGuideScreen() {
  const [expandedId, setExpandedId] = useState<string | null>('deposit');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Know your rights as a tenant. This guide covers the essentials — always consult a local attorney for specific advice.
        </Text>

        {SECTIONS.map((section) => {
          const expanded = expandedId === section.id;
          return (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setExpandedId(expanded ? null : section.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
              >
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.sectionContent}>
                  <View style={styles.divider} />
                  {formatContent(section.content)}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚠️ Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This guide is for general informational purposes only and does not constitute legal advice. Laws vary significantly by state and locality. For your specific situation, consult a licensed attorney or contact a local legal aid organization.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatContent(content: string) {
  const lines = content.split('\n').filter(Boolean);
  return lines.map((line, i) => {
    const isBold = line.startsWith('**') && line.includes(':**');
    const isBullet = line.startsWith('•');

    if (isBold) {
      const parts = line.split(':**');
      return (
        <Text key={i} style={styles.paragraph}>
          <Text style={styles.bold}>{parts[0].replace('**', '')}:</Text>
          {parts[1]}
        </Text>
      );
    }
    if (isBullet) {
      return (
        <Text key={i} style={[styles.paragraph, styles.bulletItem]}>
          {line}
        </Text>
      );
    }
    return (
      <Text key={i} style={styles.paragraph}>
        {line}
      </Text>
    );
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 60 },
  intro: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  chevron: { color: Colors.textMuted, fontSize: 12 },
  sectionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  paragraph: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 8 },
  bold: { fontWeight: '700', color: Colors.text },
  bulletItem: { paddingLeft: 8 },
  disclaimer: {
    backgroundColor: Colors.warning + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    gap: 8,
  },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: Colors.warning },
  disclaimerText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
});
