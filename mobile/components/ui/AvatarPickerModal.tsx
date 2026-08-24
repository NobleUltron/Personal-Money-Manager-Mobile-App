import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  X,
  Check,
  User as UserIcon,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentAvatarUri?: string | null;
  onSelectAvatar: (uri: string | null) => Promise<void>;
}

const PRESET_AVATARS = [
  { id: 'pro', label: 'Executive', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'tech', label: 'Tech Lead', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'crypto', label: 'Investor', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'creative', label: 'Creative', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
  { id: 'zen', label: 'Minimalist', uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' },
  { id: 'builder', label: 'Founder', uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80' },
];

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  onClose,
  currentAvatarUri,
  onSelectAvatar,
}) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  // 1. Pick from Gallery
  const handlePickFromGallery = async () => {
    triggerHaptic.selection();
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access in your device settings to choose a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        await onSelectAvatar(dataUri);
        triggerHaptic.success();
        onClose();
      }
    } catch (e: any) {
      triggerHaptic.error();
      Alert.alert('Upload Failed', e.message || 'Could not pick image');
    } finally {
      setLoading(false);
    }
  };

  // 2. Take Photo with Camera
  const handleTakePhoto = async () => {
    triggerHaptic.selection();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow camera access in your device settings to take a photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        const asset = result.assets[0];
        const dataUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        await onSelectAvatar(dataUri);
        triggerHaptic.success();
        onClose();
      }
    } catch (e: any) {
      triggerHaptic.error();
      Alert.alert('Capture Failed', e.message || 'Could not take photo');
    } finally {
      setLoading(false);
    }
  };

  // 3. Pick Preset Avatar
  const handleSelectPreset = async (presetUri: string) => {
    triggerHaptic.selection();
    try {
      setLoading(true);
      await onSelectAvatar(presetUri);
      triggerHaptic.success();
      onClose();
    } catch (e: any) {
      triggerHaptic.error();
      Alert.alert('Update Failed', e.message || 'Could not set avatar');
    } finally {
      setLoading(false);
    }
  };

  // 4. Remove / Revert Avatar
  const handleRemoveAvatar = async () => {
    triggerHaptic.warning();
    try {
      setLoading(true);
      await onSelectAvatar(null);
      triggerHaptic.success();
      onClose();
    } catch (e: any) {
      triggerHaptic.error();
      Alert.alert('Error', e.message || 'Could not remove avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={18} color={colors.primary} />
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Profile Photo & Avatar
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Updating profile picture...
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                  {/* Action Buttons: Camera & Gallery */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleTakePhoto}
                      style={[
                        styles.actionTile,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                        <Camera size={22} color={colors.primary} />
                      </View>
                      <Text style={[styles.actionTileText, { color: colors.text }]}>
                        Take Photo
                      </Text>
                      <Text style={[styles.actionTileSub, { color: colors.textSecondary }]}>
                        Use Camera
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handlePickFromGallery}
                      style={[
                        styles.actionTile,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <ImageIcon size={22} color="#10B981" />
                      </View>
                      <Text style={[styles.actionTileText, { color: colors.text }]}>
                        Photo Library
                      </Text>
                      <Text style={[styles.actionTileSub, { color: colors.textSecondary }]}>
                        Choose Image
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Preset Avatars Section */}
                  <View style={styles.presetSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                      Or Choose a Preset Avatar
                    </Text>
                    <View style={styles.presetsGrid}>
                      {PRESET_AVATARS.map((preset) => {
                        const isSelected = currentAvatarUri === preset.uri;
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            activeOpacity={0.8}
                            onPress={() => handleSelectPreset(preset.uri)}
                            style={[
                              styles.presetItem,
                              {
                                borderColor: isSelected ? colors.primary : 'transparent',
                              },
                            ]}
                          >
                            <Image
                              source={{ uri: preset.uri }}
                              style={styles.presetImage}
                            />
                            {isSelected && (
                              <View style={[styles.selectedCheckBadge, { backgroundColor: colors.primary }]}>
                                <Check size={10} color="#FFFFFF" strokeWidth={3} />
                              </View>
                            )}
                            <Text
                              style={[
                                styles.presetLabel,
                                { color: isSelected ? colors.primary : colors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {preset.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Remove Avatar Option */}
                  {currentAvatarUri ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleRemoveAvatar}
                      style={[
                        styles.removeBtn,
                        { backgroundColor: colors.dangerLight, borderColor: 'rgba(239, 68, 68, 0.2)' },
                      ]}
                    >
                      <Trash2 size={16} color={colors.danger} />
                      <Text style={[styles.removeBtnText, { color: colors.danger }]}>
                        Remove Photo (Use Initials)
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionTile: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionTileText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  actionTileSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  presetSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  presetItem: {
    width: '30%',
    alignItems: 'center',
    padding: 6,
    borderRadius: Radius.lg,
    borderWidth: 2,
    position: 'relative',
  },
  presetImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#334155',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
