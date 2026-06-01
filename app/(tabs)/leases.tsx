import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { IS_DEMO } from '../../constants/demo';
import DemoBadge from '../../components/DemoBadge';
import { useAuthStore } from '../../store/auth';
import { useHouseholdStore } from '../../store/household';
import type { HouseholdMember } from '../../store/household';
import {
  createHousehold,
  joinHousehold,
  updateHouseholdRent,
  removeMember,
} from '../../lib/firestore';

const AVATAR_COLORS = [
  '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316',
];

function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── STATE A: No household ─────────────────────────────────────────────────────

function SetupView() {
  const uid = useAuthStore((s) => s.uid);
  const displayName = useAuthStore((s) => s.displayName);
  const setUser = useAuthStore((s) => s.setUser);
  const setHousehold = useHouseholdStore((s) => s.setHousehold);
  const setMembers = useHouseholdStore((s) => s.setMembers);

  const [householdName, setHouseholdName] = useState('');
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreate() {
    const rentNum = parseFloat(rent);
    const dueDayNum = parseInt(dueDay, 10);
    if (!householdName.trim()) { setCreateError('Enter a household name.'); return; }
    if (isNaN(rentNum) || rentNum <= 0) { setCreateError('Enter a valid monthly rent.'); return; }
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 28) { setCreateError('Due day must be 1–28.'); return; }
    setCreateError(null);

    if (IS_DEMO) {
      Alert.alert('Demo mode', 'Demo mode — not saved');
      setHousehold({
        id: 'demo-new',
        name: householdName.trim(),
        rentAmount: rentNum,
        dueDay: dueDayNum,
        ownerId: uid ?? 'demo-user-001',
        memberIds: [uid ?? 'demo-user-001'],
        inviteCode: 'DEMO01',
        createdAt: new Date().toISOString(),
      });
      setMembers([{
        uid: uid ?? 'demo-user-001',
        displayName: displayName ?? 'You',
        email: '',
        sharePercent: 100,
        shareAmount: rentNum,
        avatarUrl: null,
      }]);
      return;
    }

    setCreating(true);
    try {
      const hid = await createHousehold(uid!, householdName.trim(), rentNum, dueDayNum);
      setUser({ householdId: hid });
      setHousehold({
        id: hid,
        name: householdName.trim(),
        rentAmount: rentNum,
        dueDay: dueDayNum,
        ownerId: uid!,
        memberIds: [uid!],
        inviteCode: '',
        createdAt: new Date().toISOString(),
      });
      setMembers([{
        uid: uid!,
        displayName: displayName ?? 'You',
        email: '',
        sharePercent: 100,
        shareAmount: rentNum,
        avatarUrl: null,
      }]);
    } catch {
      setCreateError('Failed to create household. Try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) { setJoinError('Invite code must be 6 characters.'); return; }
    setJoinError(null);

    if (IS_DEMO) {
      Alert.alert('Demo mode', 'Demo mode — not saved');
      return;
    }

    setJoining(true);
    try {
      const hid = await joinHousehold(uid!, code);
      setUser({ householdId: hid });
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Failed to join. Check the code.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Set Up Your Household</Text>
        {IS_DEMO && <DemoBadge />}
      </View>

      {/* Create card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a Household</Text>
        {createError && <Text style={styles.errorText}>{createError}</Text>}

        <Text style={styles.fieldLabel}>Household Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Oak Street Apartment"
          placeholderTextColor={Colors.textMuted}
          value={householdName}
          onChangeText={setHouseholdName}
        />

        <Text style={styles.fieldLabel}>Monthly Rent ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="2400"
          placeholderTextColor={Colors.textMuted}
          value={rent}
          onChangeText={setRent}
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>Due Day (1–28)</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          placeholderTextColor={Colors.textMuted}
          value={dueDay}
          onChangeText={setDueDay}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, creating && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Join card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Join a Household</Text>
        {joinError && <Text style={styles.errorText}>{joinError}</Text>}

        <Text style={styles.fieldLabel}>Invite Code</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="ABC123"
          placeholderTextColor={Colors.textMuted}
          value={inviteCode}
          onChangeText={(v) => setInviteCode(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, joining && styles.btnDisabled]}
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── STATE B: Household exists ─────────────────────────────────────────────────

function HouseholdView() {
  const uid = useAuthStore((s) => s.uid);
  const household = useHouseholdStore((s) => s.household)!;
  const members = useHouseholdStore((s) => s.members);
  const updateRent = useHouseholdStore((s) => s.updateRent);
  const setMembers = useHouseholdStore((s) => s.setMembers);

  const isOwner = household.ownerId === uid;

  const [editingRent, setEditingRent] = useState(false);
  const [rentInput, setRentInput] = useState(String(household.rentAmount));
  const [dueDayInput, setDueDayInput] = useState(String(household.dueDay));
  const [savingRent, setSavingRent] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);

  function handleShowInviteCode() {
    Alert.alert('Invite Code', `Share this code to invite roommates:\n\n${household.inviteCode}`);
  }

  async function handleSaveRent() {
    const rentNum = parseFloat(rentInput);
    const dueDayNum = parseInt(dueDayInput, 10);
    if (isNaN(rentNum) || rentNum <= 0) { setRentError('Enter a valid rent amount.'); return; }
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 28) { setRentError('Due day must be 1–28.'); return; }
    setRentError(null);

    if (IS_DEMO) {
      Alert.alert('Demo mode', 'Demo mode — not saved');
      updateRent(rentNum);
      setEditingRent(false);
      return;
    }

    setSavingRent(true);
    try {
      await updateHouseholdRent(household.id, rentNum, dueDayNum);
      updateRent(rentNum);
      setEditingRent(false);
    } catch {
      setRentError('Failed to save. Try again.');
    } finally {
      setSavingRent(false);
    }
  }

  async function handleRemoveMember(member: HouseholdMember) {
    Alert.alert(
      'Remove Member',
      `Remove ${member.displayName} from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (IS_DEMO) {
              Alert.alert('Demo mode', 'Demo mode — not saved');
              return;
            }
            try {
              await removeMember(household.id, member.uid);
              setMembers(members.filter((m) => m.uid !== member.uid));
            } catch {
              Alert.alert('Error', 'Failed to remove member.');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Household</Text>
        {IS_DEMO && <DemoBadge />}
      </View>

      {/* Header card */}
      <View style={styles.card}>
        <Text style={styles.householdName}>{household.name}</Text>
        <TouchableOpacity onPress={handleShowInviteCode}>
          <Text style={styles.inviteCodeRow}>
            Invite Code: <Text style={styles.inviteCode}>{household.inviteCode}</Text>
            {'  '}<Text style={styles.tapHint}>(tap to view)</Text>
          </Text>
        </TouchableOpacity>
        <Text style={styles.rentLine}>
          ${household.rentAmount.toLocaleString()}/mo — Due every {household.dueDay}{ordinal(household.dueDay)} of the month
        </Text>

        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setRentInput(String(household.rentAmount));
                setDueDayInput(String(household.dueDay));
                setRentError(null);
                setEditingRent((v) => !v);
              }}
            >
              <Text style={styles.secondaryBtnText}>{editingRent ? 'Cancel' : 'Edit Rent'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShowInviteCode}>
              <Text style={styles.secondaryBtnText}>Show Invite Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {editingRent && (
          <View style={styles.editRentForm}>
            {rentError && <Text style={styles.errorText}>{rentError}</Text>}
            <Text style={styles.fieldLabel}>Monthly Rent ($)</Text>
            <TextInput
              style={styles.input}
              value={rentInput}
              onChangeText={setRentInput}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.fieldLabel}>Due Day (1–28)</Text>
            <TextInput
              style={styles.input}
              value={dueDayInput}
              onChangeText={setDueDayInput}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, savingRent && styles.btnDisabled]}
              onPress={handleSaveRent}
              disabled={savingRent}
            >
              {savingRent ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>Save Rent</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Member list */}
      <Text style={styles.sectionLabel}>Members</Text>
      {members.map((member, i) => {
        const canRemove = isOwner && member.uid !== uid;
        return (
          <View key={member.uid} style={styles.memberRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor(i) }]}>
              <Text style={styles.avatarText}>{initials(member.displayName)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.displayName}{member.uid === uid ? ' (you)' : ''}
              </Text>
              <Text style={styles.memberShare}>
                {member.sharePercent}% — ${member.shareAmount.toLocaleString()}
              </Text>
            </View>
            {canRemove && (
              <TouchableOpacity onPress={() => handleRemoveMember(member)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Root screen ───────────────────────────────────────────────────────────────

export default function LeasesScreen() {
  const household = useHouseholdStore((s) => s.household);
  return (
    <SafeAreaView style={styles.container}>
      {household ? <HouseholdView /> : <SetupView />}
    </SafeAreaView>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  header: { paddingTop: 8, paddingBottom: 16, gap: 6 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    gap: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 13,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
  },
  codeInput: { letterSpacing: 4, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  errorText: { color: Colors.danger, fontSize: 13, marginTop: 4 },
  householdName: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  inviteCodeRow: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  inviteCode: { color: Colors.primary, fontWeight: '700' },
  tapHint: { color: Colors.textMuted, fontStyle: 'italic' },
  rentLine: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  ownerActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  editRentForm: { marginTop: 12, gap: 2 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  memberShare: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  removeBtn: {
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  removeBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '700' },
});
